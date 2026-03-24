import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { cosineSimilarity, extractTags, type TagVector } from '@/lib/tag-affinity';
import { logger } from '@/lib/logger';

const CACHE_TTL_SECONDS = 180; // 3 minutes

const querySchema = z.object({
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

interface ScoredPost {
  id: string;
  content: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  bornAt: string;
  expiresAt: string | null;
  fuelPointsTotal: number;
  score: number;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
    temp_state: string;
  };
  likeCount: number;
  commentCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      cursor: searchParams.get('cursor') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { cursor, limit } = parsed.data;

    // Try cached ranked list
    const cacheKey = `foryou:${user.id}`;
    let rankedIds = await redis.get<string[]>(cacheKey);

    if (!rankedIds) {
      // Build ranked list fresh
      rankedIds = await buildRankedFeed(user.id);
      await redis.set(cacheKey, rankedIds, CACHE_TTL_SECONDS);
    }

    // Paginate with offset cursor
    const pageIds = rankedIds.slice(cursor, cursor + limit);
    const hasMore = cursor + limit < rankedIds.length;
    const nextCursor = hasMore ? cursor + limit : null;

    if (pageIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor, hasMore });
    }

    // Fetch full post data for this page
    const posts = await prisma.post.findMany({
      where: { id: { in: pageIds } },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, temp_state: true },
        },
        stats: { select: { likeCount: true, commentCount: true } },
      },
    });

    // Re-order to match ranked order
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const orderedPosts = pageIds
      .map((id) => postMap.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    return NextResponse.json({
      posts: orderedPosts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
        audioUrl: p.audioUrl,
        videoUrl: p.videoUrl,
        bornAt: p.born_at.toISOString(),
        expiresAt: p.expiresAt?.toISOString() ?? null,
        fuelPointsTotal: p.fuel_points_total,
        author: p.author,
        likeCount: p.stats?.likeCount ?? 0,
        commentCount: p.stats?.commentCount ?? 0,
      })),
      nextCursor,
      hasMore,
    });
  } catch (e) {
    logger.error('GET /api/feed/foryou error', { err: String(e) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildRankedFeed(userId: string): Promise<string[]> {
  const now = new Date();

  // Get blocked user IDs (using reports as proxy — future: add explicit block table)
  const reports = await prisma.report.findMany({
    where: { reporterId: userId },
    select: { post: { select: { authorId: true } } },
  });
  const blockedAuthorIds = Array.from(new Set(
    reports.map((r) => r.post?.authorId).filter((id): id is string => !!id)
  ));

  // Get posts seen in last 2h (from Redis seen set)
  const seenKey = `seen:${userId}`;

  const candidates = await prisma.post.findMany({
    where: {
      is_expired: false,
      is_crystallised: false,
      expiresAt: { gt: now },
      authorId: { notIn: [userId, ...blockedAuthorIds] },
    },
    select: {
      id: true,
      content: true,
      born_at: true,
      expiresAt: true,
      fuel_points_total: true,
      author: {
        select: { id: true, temp_state: true },
      },
    },
    take: 200, // score top 200 candidates
  });

  // Fetch user's tag vector
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { tag_vector: true },
  });
  const tagVector: TagVector =
    userRecord?.tag_vector && typeof userRecord.tag_vector === 'object'
      ? (userRecord.tag_vector as TagVector)
      : {};

  // Score each candidate
  const scored: Array<{ id: string; score: number }> = [];

  for (const post of candidates) {
    // Skip seen posts
    const wasSeen = await redis.setIsMember(seenKey, post.id);
    if (wasSeen) continue;

    const ageMinutes = Math.max(1, (now.getTime() - post.born_at.getTime()) / 60_000);
    const fuelPerMinute = post.fuel_points_total / ageMinutes;

    const authorTempBonus =
      post.author.temp_state === 'ON_FIRE' ? 15 :
      post.author.temp_state === 'GLOWING' ? 5 : 0;

    const postTags = extractTags(post.content);
    const tagAffinity = cosineSimilarity(postTags, tagVector);

    const totalMs = post.expiresAt
      ? post.expiresAt.getTime() - post.born_at.getTime()
      : 1;
    const remainingMs = post.expiresAt
      ? Math.max(0, post.expiresAt.getTime() - now.getTime())
      : 0;
    const freshnessScore = totalMs > 0 ? remainingMs / totalMs : 0;

    const score =
      fuelPerMinute * 40 +
      authorTempBonus * 15 +
      tagAffinity * 30 +
      freshnessScore * 15;

    scored.push({ id: post.id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.id);
}
