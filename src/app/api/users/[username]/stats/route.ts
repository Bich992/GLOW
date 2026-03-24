import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: params.username },
      select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Single aggregation query for all stats
    const stats = await prisma.$queryRaw<{
      total_lifetime_seconds: bigint | null;
      record_seconds: bigint | null;
      crystals: bigint;
      posts_7d: bigint;
      posts_30d: bigint;
      generosity_fuel: number | null;
    }[]>`
      SELECT
        EXTRACT(EPOCH FROM SUM(CASE WHEN "is_expired" = true THEN ("expiresAt" - "born_at") ELSE NULL END))::bigint AS total_lifetime_seconds,
        EXTRACT(EPOCH FROM MAX(CASE WHEN "is_expired" = true THEN ("expiresAt" - "born_at") ELSE NULL END))::bigint AS record_seconds,
        COUNT(CASE WHEN "is_crystallised" = true THEN 1 END) AS crystals,
        COUNT(CASE WHEN "publishedAt" >= NOW() - INTERVAL '7 days' THEN 1 END) AS posts_7d,
        COUNT(CASE WHEN "publishedAt" >= NOW() - INTERVAL '30 days' THEN 1 END) AS posts_30d,
        NULL::float AS generosity_fuel
      FROM "Post"
      WHERE "authorId" = ${user.id}
    `;

    // Generosity: FUEL spent on other users' posts
    const generosityResult = await prisma.tokenTransaction.aggregate({
      where: {
        userId: user.id,
        type: 'spend',
        post: { authorId: { not: user.id } },
        amount: { lt: 0 },
      },
      _sum: { amount: true },
    });
    const generosity = Math.abs(generosityResult._sum.amount ?? 0);

    // Live posts with countdown
    const livePosts = await prisma.post.findMany({
      where: { authorId: user.id, is_expired: false, is_crystallised: false },
      select: {
        id: true,
        content: true,
        expiresAt: true,
        born_at: true,
        stats: { select: { likeCount: true, commentCount: true } },
      },
      orderBy: { expiresAt: 'asc' },
    });

    const row = stats[0];

    return NextResponse.json({
      user,
      totalLifetimeSeconds: Number(row?.total_lifetime_seconds ?? 0),
      recordSeconds: Number(row?.record_seconds ?? 0),
      generosityFuel: generosity,
      crystals: Number(row?.crystals ?? 0),
      posts7d: Number(row?.posts_7d ?? 0),
      posts30d: Number(row?.posts_30d ?? 0),
      livePosts: livePosts.map((p) => ({
        id: p.id,
        content: p.content,
        expiresAt: p.expiresAt?.toISOString() ?? null,
        bornAt: p.born_at.toISOString(),
        likeCount: p.stats?.likeCount ?? 0,
        commentCount: p.stats?.commentCount ?? 0,
      })),
    });
  } catch (e) {
    console.error('GET /api/users/[username]/stats error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
