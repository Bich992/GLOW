import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

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

    // Get IDs of followed users
    const follows = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const followedUserIds = follows.map((f) => f.followingId);

    if (followedUserIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null, hasMore: false });
    }

    const now = new Date();

    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: followedUserIds },
        is_expired: false,
        is_crystallised: false,
        expiresAt: { gt: now },
        ...(cursor ? { born_at: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { born_at: 'desc' },
      take: limit + 1,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            temp_state: true,
          },
        },
        stats: { select: { likeCount: true, commentCount: true } },
      },
    });

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? page[page.length - 1]?.born_at.toISOString() ?? null : null;

    return NextResponse.json({
      posts: page.map((p) => ({
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
    logger.error('GET /api/feed/following error', { err: String(e) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
