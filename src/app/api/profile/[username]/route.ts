import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const currentUser = await getServerSession();

    const user = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      include: {
        profile: true,
        posts: {
          where: { status: { in: ['live', 'expired'] }, hiddenByMod: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            stats: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if current user is following
    let isFollowing = false;
    if (currentUser) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      profile: user.profile,
      posts: user.posts,
      isFollowing,
    });
  } catch (e) {
    console.error('GET /api/profile error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
