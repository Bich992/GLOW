import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const followSchema = z.object({
  targetUserId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { targetUserId } = parsed.data;

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Toggle follow
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      // Unfollow
      await prisma.follow.delete({ where: { id: existing.id } });
      await prisma.profile.updateMany({
        where: { userId: user.id },
        data: { followingCount: { decrement: 1 } },
      });
      await prisma.profile.updateMany({
        where: { userId: targetUserId },
        data: { followerCount: { decrement: 1 } },
      });
      return NextResponse.json({ following: false });
    } else {
      // Follow
      await prisma.follow.create({
        data: { followerId: user.id, followingId: targetUserId },
      });
      await prisma.profile.updateMany({
        where: { userId: user.id },
        data: { followingCount: { increment: 1 } },
      });
      await prisma.profile.updateMany({
        where: { userId: targetUserId },
        data: { followerCount: { increment: 1 } },
      });
      // Notifica
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'follow',
          title: 'New follower',
          body: `${user.displayName} started following you`,
          actorId: user.id,
        },
      });
      return NextResponse.json({ following: true });
    }
  } catch (e) {
    console.error('POST /api/follow error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
