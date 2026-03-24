import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  status: z.enum(['live', 'crystallised']).default('live'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: params.username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ status: searchParams.get('status') ?? undefined });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { status } = parsed.data;

    if (status === 'live') {
      const posts = await prisma.post.findMany({
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

      return NextResponse.json(
        posts.map((p) => ({
          id: p.id,
          content: p.content,
          expiresAt: p.expiresAt?.toISOString() ?? null,
          bornAt: p.born_at.toISOString(),
          likeCount: p.stats?.likeCount ?? 0,
          commentCount: p.stats?.commentCount ?? 0,
        }))
      );
    }

    // Crystallised posts with voter info
    const posts = await prisma.post.findMany({
      where: { authorId: user.id, is_crystallised: true },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        audioUrl: true,
        videoUrl: true,
        createdAt: true,
        crystallise_votes: {
          select: {
            user: { select: { username: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      posts.map((p) => ({
        id: p.id,
        content: p.content,
        imageUrl: p.imageUrl,
        audioUrl: p.audioUrl,
        videoUrl: p.videoUrl,
        createdAt: p.createdAt.toISOString(),
        voteCount: p.crystallise_votes.length,
        voters: p.crystallise_votes.map((v) => ({
          username: v.user.username,
          avatarUrl: v.user.avatarUrl,
        })),
      }))
    );
  } catch (e) {
    logger.error('GET /api/users/[username]/posts error', { err: String(e) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
