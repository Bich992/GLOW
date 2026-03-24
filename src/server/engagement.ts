import { prisma } from '@/lib/db';
import { REMOTE_CONFIG_DEFAULTS } from '@/lib/config';
import { LIFETIME_DELTAS_MS } from '@/lib/lifetime';
import { creditWallet } from './wallet';
import { computeER60 } from './economy';
import { createNotification } from './notifications';

/** Atomically extend a post's expires_at by deltaMs milliseconds using raw SQL. */
async function extendPostLifetime(postId: string, deltaMs: number): Promise<void> {
  const deltaSeconds = Math.floor(deltaMs / 1000);
  await prisma.$executeRaw`
    UPDATE "Post"
    SET "expiresAt" = "expiresAt" + (${deltaSeconds} * interval '1 second')
    WHERE id = ${postId} AND "is_expired" = false
  `;
}

export async function addLike(
  userId: string,
  postId: string
): Promise<{ liked: boolean; likeCount: number }> {
  // Fetch post first (outside transaction)
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true },
  });
  if (!post) throw new Error('Post not found');
  if (post.status !== 'live') throw new Error('Post is not live');

  // Self-interaction guard
  if (post.authorId === userId) {
    throw new Error('Cannot like your own post');
  }

  // Check if already liked
  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    // Unlike — simple update, no reward needed
    await prisma.like.delete({ where: { postId_userId: { postId, userId } } });
    await prisma.postStats.updateMany({
      where: { postId },
      data: { likeCount: { decrement: 1 } },
    });
    const stats = await prisma.postStats.findUnique({ where: { postId } });
    return { liked: false, likeCount: stats?.likeCount ?? 0 };
  }

  // Like — create record and update stats
  await prisma.like.create({ data: { postId, userId } });
  await prisma.postStats.updateMany({
    where: { postId },
    data: { likeCount: { increment: 1 } },
  });

  const stats = await prisma.postStats.findUnique({ where: { postId } });
  const likeCount = stats?.likeCount ?? 1;

  // Extend post lifetime
  await extendPostLifetime(postId, LIFETIME_DELTAS_MS.like).catch(
    (e) => console.warn('extendPostLifetime failed:', e)
  );

  // Side effects: reward + notification (after the like is committed)
  if (post.authorId !== userId) {
    const earnAmount = REMOTE_CONFIG_DEFAULTS.LIKE_EARN_TIMT;
    await creditWallet(post.authorId, earnAmount, `Like received on post`, 'earn', postId).catch(
      (e) => console.warn('creditWallet failed:', e)
    );
    await createNotification({
      userId: post.authorId,
      type: 'like',
      title: 'New like',
      body: 'Someone liked your post!',
      postId,
      actorId: userId,
    });
  }

  return { liked: true, likeCount };
}

export async function addComment(
  userId: string,
  postId: string,
  content: string,
  parentId?: string
): Promise<{ id: string }> {
  const minLength = REMOTE_CONFIG_DEFAULTS.COMMENT_MIN_LENGTH;
  const earnAmount = REMOTE_CONFIG_DEFAULTS.COMMENT_EARN_TIMT;

  if (content.trim().length < minLength) {
    throw new Error(`Comment must be at least ${minLength} characters`);
  }

  // Rate limit: max 10 comments per user per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentComments = await prisma.comment.count({
    where: { userId, createdAt: { gte: oneHourAgo } },
  });
  if (recentComments >= 10) {
    throw new Error('Comment rate limit exceeded (10 per hour)');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true },
  });
  if (!post) throw new Error('Post not found');
  if (post.status !== 'live') throw new Error('Post is not live');
  if (post.authorId === userId) throw new Error('Cannot comment on your own post to earn rewards');

  const comment = await prisma.comment.create({
    data: { postId, userId, content: content.trim(), ...(parentId ? { parentId } : {}) },
  });

  await prisma.postStats.updateMany({
    where: { postId },
    data: { commentCount: { increment: 1 } },
  });

  // Extend post lifetime (+15 min only for comments >= 20 chars)
  if (content.trim().length >= 20) {
    await extendPostLifetime(postId, LIFETIME_DELTAS_MS.comment).catch(
      (e) => console.warn('extendPostLifetime failed:', e)
    );
  }

  // Side effects: reward + notification
  if (post.authorId !== userId) {
    await creditWallet(post.authorId, earnAmount, `Comment received on post`, 'earn', postId).catch(
      (e) => console.warn('creditWallet failed:', e)
    );
    await createNotification({
      userId: post.authorId,
      type: 'comment',
      title: 'New comment',
      body: `Someone commented: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`,
      postId,
      actorId: userId,
    });
  }

  return { id: comment.id };
}

export async function maybeAwardEngagementBonus(postId: string): Promise<boolean> {
  const theta = REMOTE_CONFIG_DEFAULTS.TIMELY_THETA_ER60;
  const bonusAmount = REMOTE_CONFIG_DEFAULTS.ER60_BONUS_TIMT;
  const intervalHours = REMOTE_CONFIG_DEFAULTS.ER60_BONUS_INTERVAL_HOURS;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { stats: true },
  });

  if (!post || post.status !== 'live') return false;

  const stats = post.stats;
  if (!stats) return false;

  const lastAward = stats.er60UpdatedAt;
  const intervalMs = intervalHours * 60 * 60 * 1000;
  if (Date.now() - lastAward.getTime() < intervalMs) return false;

  const er60 = await computeER60(postId);

  if (er60 >= theta) {
    await prisma.postStats.update({
      where: { postId },
      data: { er60, er60UpdatedAt: new Date() },
    });
    await creditWallet(
      post.authorId,
      bonusAmount,
      `Engagement bonus (ER60=${er60.toFixed(1)})`,
      'earn',
      postId
    );
    return true;
  }

  await prisma.postStats.update({ where: { postId }, data: { er60 } });
  return false;
}
