import { prisma } from '@/lib/db';
import { REMOTE_CONFIG_DEFAULTS } from '@/lib/config';
import { computeExpiresAt, FUEL_WEIGHTS } from '@/lib/glow-engine';
import { logger } from '@/lib/logger';
import { creditWallet } from './wallet';
import { computeER60 } from './economy';
import { createNotification } from './notifications';

/**
 * Increments a post's fuel_points_total by `delta` and recomputes expiresAt
 * using the Glow Engine formula. Also checks for crystallisation threshold.
 * Must be called inside a Prisma transaction.
 */
async function applyFuelAndRecomputeTTL(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  postId: string,
  delta: number
): Promise<void> {
  const post = await tx.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      born_at: true,
      born_during_wave: true,
      fuel_points_total: true,
      is_crystallised: true,
      is_expired: true,
      crystallise_threshold: true,
      author: { select: { glow_trust: true } },
    },
  });

  if (!post || post.is_expired || post.is_crystallised) return;

  const newFuelPoints = post.fuel_points_total + delta;
  const newExpiresAt = computeExpiresAt({
    bornAt: post.born_at,
    currentFuelPoints: newFuelPoints,
    authorGlowTrust: post.author.glow_trust,
    bornDuringWave: post.born_during_wave,
  });

  // Check crystallisation threshold
  const voteCount = await tx.crystallisationVote.count({ where: { postId } });
  const shouldCrystallise = voteCount >= post.crystallise_threshold;

  if (shouldCrystallise) {
    await tx.post.update({
      where: { id: postId },
      data: {
        fuel_points_total: newFuelPoints,
        is_crystallised: true,
        is_expired: false,
        expiresAt: null,
      },
    });
    logger.info('Post crystallised via fuel threshold', { postId, voteCount });
  } else {
    await tx.post.update({
      where: { id: postId },
      data: {
        fuel_points_total: newFuelPoints,
        expiresAt: newExpiresAt,
      },
    });
  }
}

export async function addLike(
  userId: string,
  postId: string
): Promise<{ liked: boolean; likeCount: number }> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, status: true },
  });
  if (!post) throw new Error('Post not found');
  if (post.status !== 'live') throw new Error('Post is not live');
  if (post.authorId === userId) throw new Error('Cannot like your own post');

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    // Unlike — reverse the fuel delta
    await prisma.$transaction(async (tx) => {
      await tx.like.delete({ where: { postId_userId: { postId, userId } } });
      await tx.postStats.updateMany({
        where: { postId },
        data: { likeCount: { decrement: 1 } },
      });
      await applyFuelAndRecomputeTTL(tx, postId, -FUEL_WEIGHTS.like);
    });
    const stats = await prisma.postStats.findUnique({ where: { postId } });
    return { liked: false, likeCount: stats?.likeCount ?? 0 };
  }

  // Like — add fuel delta
  await prisma.$transaction(async (tx) => {
    await tx.like.create({ data: { postId, userId } });
    await tx.postStats.updateMany({
      where: { postId },
      data: { likeCount: { increment: 1 } },
    });
    await applyFuelAndRecomputeTTL(tx, postId, FUEL_WEIGHTS.like);
  });

  const stats = await prisma.postStats.findUnique({ where: { postId } });
  const likeCount = stats?.likeCount ?? 1;

  // Side effects outside transaction
  const earnAmount = REMOTE_CONFIG_DEFAULTS.LIKE_EARN_TIMT;
  await creditWallet(post.authorId, earnAmount, 'Like received on post', 'earn', postId).catch(
    (e: unknown) => logger.warn('creditWallet failed', { err: String(e) })
  );
  await createNotification({
    userId: post.authorId,
    type: 'like',
    title: 'New like',
    body: 'Someone liked your post!',
    postId,
    actorId: userId,
  });

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

  // Fuel delta only for comments meeting the minimum length
  const qualifiesForFuel = content.trim().length >= 20;
  const fuelDelta = qualifiesForFuel ? FUEL_WEIGHTS.comment : 0;

  const comment = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: { postId, userId, content: content.trim(), ...(parentId ? { parentId } : {}) },
    });
    await tx.postStats.updateMany({
      where: { postId },
      data: { commentCount: { increment: 1 } },
    });
    if (fuelDelta > 0) {
      await applyFuelAndRecomputeTTL(tx, postId, fuelDelta);
    }
    return c;
  });

  // Side effects outside transaction
  await creditWallet(post.authorId, earnAmount, 'Comment received on post', 'earn', postId).catch(
    (e: unknown) => logger.warn('creditWallet failed', { err: String(e) })
  );
  await createNotification({
    userId: post.authorId,
    type: 'comment',
    title: 'New comment',
    body: `Someone commented: "${content.slice(0, 50)}${content.length > 50 ? '...' : ''}"`,
    postId,
    actorId: userId,
  });

  return { id: comment.id };
}

/**
 * Applies echo fuel weight to a post.
 * Called from the echo API route after the echo record is created.
 */
export async function applyEchoFuel(postId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await applyFuelAndRecomputeTTL(tx, postId, FUEL_WEIGHTS.echo);
  });
}

/**
 * Applies boost fuel weight proportional to the FUEL amount spent.
 * Called from the boost API route after the boost record is created.
 */
export async function applyBoostFuel(postId: string, amount: number): Promise<void> {
  const delta = amount * FUEL_WEIGHTS.boost_per_fuel;
  await prisma.$transaction(async (tx) => {
    await applyFuelAndRecomputeTTL(tx, postId, delta);
  });
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
