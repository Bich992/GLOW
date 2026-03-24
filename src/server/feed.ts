import { prisma } from '@/lib/db';
import { computeBoostPriority, computeER60 } from './economy';

export interface FeedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  status: string;
  publishedAt: Date | null;
  expiresAt: Date | null;
  born_at: Date;
  is_expired: boolean;
  boostPriority: number;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  stats: {
    likeCount: number;
    commentCount: number;
    extensionCount: number;
    boostCount: number;
    totalBoostTimt: number;
    er60: number;
  } | null;
  _likedByCurrentUser?: boolean;
}

export async function getFeed(options: {
  userId?: string;
  limit?: number;
  cursor?: string;
  filter?: 'all' | 'following';
}): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const { userId, limit = 20, cursor, filter = 'all' } = options;

  let followingIds: string[] = [];
  if (filter === 'following' && userId) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    followingIds = follows.map((f) => f.followingId);
  }

  const where = {
    hiddenByMod: false,
    is_crystallised: false,
    expiresAt: { gt: new Date() },
    ...(filter === 'following' && userId
      ? { authorId: { in: followingIds } }
      : {}),
    ...(cursor ? { id: { lt: cursor } } : {}),
  };

  // Fetch posts with all needed relations
  const posts = await prisma.post.findMany({
    where,
    take: limit + 1,
    orderBy: [
      { expiresAt: 'asc' },
      { boostPriority: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      stats: true,
      boosts: {
        where: {
          expiresAt: { gt: new Date() },
        },
        select: {
          amount: true,
          createdAt: true,
          expiresAt: true,
        },
      },
      likes: userId
        ? {
            where: { userId },
            select: { id: true },
          }
        : false,
    },
  });

  let hasNextPage = false;
  let nextCursor: string | null = null;

  if (posts.length > limit) {
    hasNextPage = true;
    posts.pop();
  }

  if (hasNextPage && posts.length > 0) {
    nextCursor = posts[posts.length - 1].id;
  }

  // Sort by the actual feed ordering algorithm
  const sortedPosts = posts.sort((a, b) => {
    // 1. expiresAt ascending (soonest expiry first)
    const aExpiry = a.expiresAt ? a.expiresAt.getTime() : Infinity;
    const bExpiry = b.expiresAt ? b.expiresAt.getTime() : Infinity;
    if (aExpiry !== bExpiry) return aExpiry - bExpiry;

    // 2. boost priority descending
    const aPriority = computeBoostPriority(a.boosts);
    const bPriority = computeBoostPriority(b.boosts);
    if (aPriority !== bPriority) return bPriority - aPriority;

    // 3. ER60 descending
    const aEr60 = a.stats?.er60 ?? 0;
    const bEr60 = b.stats?.er60 ?? 0;
    if (aEr60 !== bEr60) return bEr60 - aEr60;

    // 4. freshness descending
    const aCreated = a.createdAt.getTime();
    const bCreated = b.createdAt.getTime();
    return bCreated - aCreated;
  });

  const feedPosts: FeedPost[] = sortedPosts.map((post) => ({
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    audioUrl: (post as unknown as { audioUrl?: string | null }).audioUrl ?? null,
    videoUrl: (post as unknown as { videoUrl?: string | null }).videoUrl ?? null,
    status: post.status,
    publishedAt: post.publishedAt,
    expiresAt: post.expiresAt,
    born_at: (post as unknown as { born_at: Date }).born_at,
    is_expired: (post as unknown as { is_expired: boolean }).is_expired,
    boostPriority: computeBoostPriority(post.boosts),
    createdAt: post.createdAt,
    author: post.author,
    stats: post.stats
      ? {
          likeCount: post.stats.likeCount,
          commentCount: post.stats.commentCount,
          extensionCount: post.stats.extensionCount,
          boostCount: post.stats.boostCount,
          totalBoostTimt: post.stats.totalBoostTimt,
          er60: post.stats.er60,
        }
      : null,
    _likedByCurrentUser: userId ? (post.likes as { id: string }[]).length > 0 : false,
  }));

  return { posts: feedPosts, nextCursor };
}

export async function getPostById(postId: string, userId?: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
      },
      stats: true,
      boosts: {
        where: { expiresAt: { gt: new Date() } },
        select: { amount: true, createdAt: true, expiresAt: true },
      },
      comments: {
        where: { hiddenByMod: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      likes: userId ? { where: { userId }, select: { id: true } } : false,
    },
  });

  if (!post) return null;

  return {
    ...post,
    boostPriority: computeBoostPriority(post.boosts),
    _likedByCurrentUser: userId ? (post.likes as { id: string }[]).length > 0 : false,
  };
}

export async function updatePostBoostPriority(postId: string): Promise<void> {
  const boosts = await prisma.postBoost.findMany({
    where: { postId, expiresAt: { gt: new Date() } },
    select: { amount: true, createdAt: true, expiresAt: true },
  });

  const priority = computeBoostPriority(boosts);
  await prisma.post.update({
    where: { id: postId },
    data: { boostPriority: priority },
  });
}

export { computeER60 };
