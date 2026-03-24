import { prisma } from '@/lib/db';
import { REMOTE_CONFIG_DEFAULTS } from '@/lib/config';

/**
 * Compute the extension delta in seconds for the nth extension by a user.
 * delta_t = round(3600 * 0.8^s), minimum 300 seconds (5 minutes)
 */
export function computeDeltaSeconds(s: number): number {
  const base = REMOTE_CONFIG_DEFAULTS.EXT_BASE_SEC;
  const decay = REMOTE_CONFIG_DEFAULTS.EXT_DECAY;
  const minSec = REMOTE_CONFIG_DEFAULTS.EXT_MIN_SEC;
  const delta = Math.round(base * Math.pow(decay, s));
  return Math.max(delta, minSec);
}

/**
 * Compute boost priority for a post based on active boosts.
 * 1 TIMT = +20% feed priority for 20 minutes (rolling window: 120 min).
 * Max simultaneous boost effect: +200% (i.e., priority multiplier max = 3.0).
 */
export function computeBoostPriority(
  boosts: Array<{ amount: number; createdAt: Date; expiresAt: Date }>
): number {
  const now = new Date();
  const windowMs = REMOTE_CONFIG_DEFAULTS.BOOST_WINDOW_MIN * 60 * 1000;
  const priorityPerTimt = REMOTE_CONFIG_DEFAULTS.BOOST_PRIORITY_PER_TIMT; // 0.2 = 20%
  const maxPriority = REMOTE_CONFIG_DEFAULTS.BOOST_MAX_PRIORITY_PCT; // 2.0 = 200%

  // Filter boosts active in rolling window
  const activeBoosts = boosts.filter(
    (b) => b.expiresAt > now && new Date(b.createdAt).getTime() > now.getTime() - windowMs
  );

  const totalTimt = activeBoosts.reduce((sum, b) => sum + b.amount, 0);
  const boostEffect = Math.min(totalTimt * priorityPerTimt, maxPriority);

  // Return as multiplier: 1.0 = no boost, 3.0 = max boost
  return 1.0 + boostEffect;
}

/**
 * Compute engagement rate for last 60 minutes.
 * ER_60 = likes_60 * 1 + comments_60 * 3
 */
export async function computeER60(postId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);

  const [likes60, comments60] = await Promise.all([
    prisma.like.count({
      where: { postId, createdAt: { gte: since } },
    }),
    prisma.comment.count({
      where: { postId, createdAt: { gte: since } },
    }),
  ]);

  return likes60 * 1 + comments60 * 3;
}

/**
 * Apply daily faucet cap to an earn amount.
 * Returns the actual amount that can be credited (may be reduced).
 * Also updates the wallet's earnedToday counter.
 */
const ORGANIC_DAILY_CAP = 15; // max 15 FUEL per day from organic activity

export async function applyDailyFaucetCap(
  userId: string,
  amount: number
): Promise<number> {
  const dailyCap = ORGANIC_DAILY_CAP;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw new Error('Wallet not found');

  // Reset daily counter if it's a new day
  const now = new Date();
  const resetAt = new Date(wallet.earnResetAt);
  const isNewDay =
    now.getFullYear() !== resetAt.getFullYear() ||
    now.getMonth() !== resetAt.getMonth() ||
    now.getDate() !== resetAt.getDate();

  const earnedToday = isNewDay ? 0 : wallet.earnedToday;
  const remaining = Math.max(0, dailyCap - earnedToday);
  const actualAmount = Math.min(amount, remaining);

  return actualAmount;
}
