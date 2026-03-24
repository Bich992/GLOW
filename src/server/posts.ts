import { prisma } from '@/lib/db';
import { REMOTE_CONFIG_DEFAULTS } from '@/lib/config';
import { LIFETIME_DELTAS_MS } from '@/lib/lifetime';
import { computeDeltaSeconds, computeBoostPriority } from './economy';
import { debitWallet } from './wallet';
import { createNotification } from './notifications';

export async function publishPost(
  userId: string,
  content: string,
  imageUrl?: string,
  audioUrl?: string,
  videoUrl?: string,
  localHour?: number
): Promise<{ id: string }> {
  const now = new Date();

  // Wave-based lifetime: 1 hour inside a wave, 30 min outside
  const { getActiveWave } = await import('@/lib/waves');
  const hour = localHour !== undefined && !isNaN(localHour) ? localHour : now.getUTCHours();
  const activeWave = getActiveWave(hour);
  const initialDurationMs = activeWave ? 60 * 60 * 1000 : 30 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + initialDurationMs);

  // Compute crystallisation threshold
  const { subHours } = await import('date-fns');
  const activeUsersLast24h = await prisma.user.count({
    where: { last_active_at: { gte: subHours(new Date(), 24) } },
  });
  const crystallise_threshold = Math.max(5, Math.round(activeUsersLast24h * 0.07));

  return await prisma.$transaction(async (tx) => {
    // Create the post — publishing is free (no wallet deduction)
    const post = await tx.post.create({
      data: {
        authorId: userId,
        content,
        imageUrl,
        audioUrl,
        videoUrl,
        status: 'live',
        publishedAt: now,
        born_at: now,
        expiresAt,
        boostPriority: 1.0,
        crystallise_threshold,
        stats: {
          create: {},
        },
      },
    });

    // Update profile post count
    await tx.profile.updateMany({
      where: { userId },
      data: { postCount: { increment: 1 } },
    });

    return { id: post.id };
  });
}

export async function extendPost(userId: string, postId: string): Promise<{ newExpiresAt: Date }> {
  const maxPerDay = REMOTE_CONFIG_DEFAULTS.EXT_MAX_PER_USER_DAY;
  const dailyCapSec = REMOTE_CONFIG_DEFAULTS.POST_DAILY_CAP_SEC;

  return await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      include: { extensions: true },
    });
    if (!post) throw new Error('Post not found');
    if (post.status !== 'live') throw new Error('Post is not live');
    if (!post.expiresAt) throw new Error('Post has no expiry');

    // Check extensions by this user today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const extensionsTodayByUser = await tx.postExtension.count({
      where: {
        postId,
        userId,
        createdAt: { gte: today },
      },
    });

    if (extensionsTodayByUser >= maxPerDay) {
      throw new Error(`Maximum ${maxPerDay} extensions per user per post per day`);
    }

    // Check total daily cap for post
    const todayExtensions = await tx.postExtension.findMany({
      where: { postId, createdAt: { gte: today } },
    });
    const totalAddedToday = todayExtensions.reduce((sum, e) => sum + e.deltaSeconds, 0);

    if (totalAddedToday >= dailyCapSec) {
      throw new Error('Post has reached maximum daily extension cap (+12 hours)');
    }

    // Count how many times this user has extended this post (total, for decay)
    const userExtensionCount = post.extensions.filter((e) => e.userId === userId).length;
    const deltaSeconds = computeDeltaSeconds(userExtensionCount);

    // Apply daily cap
    const remainingCap = dailyCapSec - totalAddedToday;
    const actualDelta = Math.min(deltaSeconds, remainingCap);

    const currentExpiry = new Date(post.expiresAt);
    const now = new Date();
    const baseTime = currentExpiry > now ? currentExpiry : now;
    const newExpiresAt = new Date(baseTime.getTime() + actualDelta * 1000);

    await tx.post.update({
      where: { id: postId },
      data: { expiresAt: newExpiresAt },
    });

    await tx.postExtension.create({
      data: {
        postId,
        userId,
        deltaSeconds: actualDelta,
        extensionIndex: userExtensionCount,
      },
    });

    await tx.postStats.updateMany({
      where: { postId },
      data: { extensionCount: { increment: 1 } },
    });

    return { newExpiresAt };
  });
}

export async function boostPost(
  userId: string,
  postId: string,
  amount: number
): Promise<{ newPriority: number }> {
  const boostCap = REMOTE_CONFIG_DEFAULTS.BOOST_CAP;
  const minContrib = REMOTE_CONFIG_DEFAULTS.BOOST_MIN_CONTRIB;
  const windowMin = REMOTE_CONFIG_DEFAULTS.BOOST_WINDOW_MIN;
  const priorityDurationMin = REMOTE_CONFIG_DEFAULTS.BOOST_PRIORITY_DURATION_MIN;

  if (amount < minContrib) {
    throw new Error(`Minimum boost contribution is ${minContrib} TIMT`);
  }

  // Read current state first (outside transaction)
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Post not found');
  if (post.status !== 'live') throw new Error('Post is not live');

  // Self-interaction guard
  if (post.authorId === userId) throw new Error('Cannot boost your own post');

  const windowStart = new Date(Date.now() - windowMin * 60 * 1000);
  const activeBoosts = await prisma.postBoost.findMany({
    where: { postId, createdAt: { gte: windowStart }, expiresAt: { gt: new Date() } },
  });

  const totalActiveBoost = activeBoosts.reduce((sum, b) => sum + b.amount, 0);
  if (totalActiveBoost >= boostCap) {
    throw new Error(`Post boost cap (${boostCap} TIMT) reached`);
  }

  const actualAmount = Math.min(amount, boostCap - totalActiveBoost);
  const expiresAt = new Date(Date.now() + priorityDurationMin * 60 * 1000);

  // Debit wallet first (has its own transaction)
  await debitWallet(userId, actualAmount, `Boost post`, postId);

  // Create boost record and update stats
  await prisma.postBoost.create({ data: { postId, userId, amount: actualAmount, expiresAt } });

  const allActiveBoosts = [...activeBoosts, { amount: actualAmount, createdAt: new Date(), expiresAt }];
  const newPriority = computeBoostPriority(allActiveBoosts);

  await prisma.post.update({ where: { id: postId }, data: { boostPriority: newPriority } });
  await prisma.postStats.updateMany({
    where: { postId },
    data: { boostCount: { increment: 1 }, totalBoostTimt: { increment: actualAmount } },
  });

  // Extend post lifetime by +1 hour on boost
  const boostDeltaSeconds = Math.floor(LIFETIME_DELTAS_MS.boost / 1000);
  await prisma.$executeRaw`
    UPDATE "Post"
    SET "expiresAt" = "expiresAt" + (${boostDeltaSeconds} * interval '1 second')
    WHERE id = ${postId} AND "is_expired" = false
  `;

  await createNotification({
    userId: post.authorId,
    type: 'boost',
    title: 'Post boosted!',
    body: `Someone boosted your post with ${actualAmount.toFixed(2)} FUEL!`,
    postId,
    actorId: userId,
  });

  return { newPriority };
}

export async function expirePostsJob(): Promise<{ expiredCount: number }> {
  const now = new Date();

  const expiredPosts = await prisma.post.findMany({
    where: {
      status: 'live',
      expiresAt: { lte: now },
    },
    select: { id: true, authorId: true },
  });

  if (expiredPosts.length === 0) return { expiredCount: 0 };

  const postIds = expiredPosts.map((p) => p.id);

  await prisma.post.updateMany({
    where: { id: { in: postIds } },
    data: { status: 'expired' },
  });

  // Create expire notifications
  for (const post of expiredPosts) {
    await createNotification({
      userId: post.authorId,
      type: 'expire_soon',
      title: 'Post expired',
      body: 'Your post has expired and is no longer visible in the feed.',
      postId: post.id,
    });
  }

  return { expiredCount: expiredPosts.length };
}
