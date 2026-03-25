/**
 * Scouts Server — FUEL betting on anonymous Arena posts.
 *
 * Mechanics:
 *   - Scout bets X FUEL on a hidden (anonymous) post.
 *   - Risk coefficient = 1 + 1/log10(author_followers + 2)
 *     → High reward for unknowns, near-zero gain for celebrities.
 *   - On Bloom: potential_reward is paid out; "Original Scout" badge awarded.
 *   - If post expires without Bloom: FUEL is lost (high risk).
 */

import { prisma } from '@/lib/db';
import {
  calculateRiskCoefficient,
  calculatePotentialReward,
} from '@/lib/arena-engine';
import { debitWallet, creditWallet } from './wallet';
import { createNotification } from './notifications';

export interface BetResult {
  betId: string;
  fuelInvested: number;
  riskCoefficient: number;
  potentialReward: number;
}

/**
 * Place a FUEL bet on an anonymous Arena post.
 */
export async function placeFuelBet(
  scoutId: string,
  postId: string,
  fuelAmount: number
): Promise<BetResult> {
  return prisma.$transaction(async (tx) => {
    // ── Validate post ──────────────────────────────────────────────────────────
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        is_revealed: true,
        arena_state: true,
        is_expired: true,
      },
    });

    if (!post) throw new Error('Post not found');
    if (post.is_revealed) throw new Error('Post already revealed — betting closed');
    if (post.is_expired || post.arena_state === 'expired') {
      throw new Error('Post has expired');
    }

    // ── Prevent self-betting ───────────────────────────────────────────────────
    if (post.authorId === scoutId) {
      throw new Error('Cannot bet on your own post');
    }

    // ── Prevent double-betting ─────────────────────────────────────────────────
    const existing = await tx.fuelBet.findFirst({
      where: { scoutId, postId },
    });
    if (existing) throw new Error('Already placed a bet on this post');

    // ── Get author follower count (hidden from scout UI but needed for coefficient) ──
    const authorProfile = await tx.profile.findUnique({
      where: { userId: post.authorId },
      select: { followerCount: true },
    });
    const followerCount = authorProfile?.followerCount ?? 0;

    // ── Calculate payout ───────────────────────────────────────────────────────
    const riskCoefficient = calculateRiskCoefficient(followerCount);
    const potentialReward = calculatePotentialReward(fuelAmount, riskCoefficient);

    // ── Debit FUEL from scout wallet ──────────────────────────────────────────
    await debitWallet(scoutId, fuelAmount, `Scout bet — post ${postId}`, postId);

    // ── Record the bet ────────────────────────────────────────────────────────
    const bet = await tx.fuelBet.create({
      data: {
        scoutId,
        postId,
        fuel_invested: fuelAmount,
        author_follower_count_snapshot: followerCount,
        risk_coefficient: riskCoefficient,
        potential_reward: potentialReward,
      },
    });

    // ── Update post scout counters ─────────────────────────────────────────────
    await tx.post.update({
      where: { id: postId },
      data: {
        total_fuel_bet: { increment: fuelAmount },
        scout_count: { increment: 1 },
      },
    });

    return {
      betId: bet.id,
      fuelInvested: fuelAmount,
      riskCoefficient,
      potentialReward,
    };
  });
}

/**
 * Settle all outstanding bets when a post blooms.
 * Called internally by presence.ts after bloom detection.
 */
export async function settleAllBets(postId: string, authorId: string): Promise<void> {
  const bets = await prisma.fuelBet.findMany({
    where: { postId, is_settled: false },
    select: {
      id: true,
      scoutId: true,
      potential_reward: true,
    },
  });

  if (bets.length === 0) return;

  // Settle each scout's reward
  await Promise.allSettled(
    bets.map(async (bet) => {
      await creditWallet(
        bet.scoutId,
        bet.potential_reward,
        `Scout payout — post ${postId} bloomed`,
        'earn',
        postId,
        false // bypass daily cap for bet settlements
      );

      await prisma.fuelBet.update({
        where: { id: bet.id },
        data: {
          is_settled: true,
          actual_reward: bet.potential_reward,
          settled_at: new Date(),
        },
      });

      // Notify the scout
      await createNotification({
        userId: bet.scoutId,
        type: 'scout_payout',
        title: 'Your scout bet paid off! 💰',
        body: `You earned ${bet.potential_reward.toFixed(2)} FUEL — the post just bloomed.`,
        postId,
      }).catch(() => {});
    })
  );
}

/**
 * When a post expires without blooming, mark all bets as lost.
 * Called by the expire-posts cron job.
 */
export async function forfeitAllBets(postId: string): Promise<void> {
  await prisma.fuelBet.updateMany({
    where: { postId, is_settled: false },
    data: {
      is_settled: true,
      actual_reward: 0,
      settled_at: new Date(),
    },
  });
}
