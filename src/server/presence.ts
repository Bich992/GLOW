/**
 * Presence Server — processes long-press viewing events from the Arena feed.
 *
 * Flow per event:
 *  1. Load (or create) PresenceTracking record for (user, post).
 *  2. Calculate effective contribution with diminishing returns + cap.
 *  3. Apply bounce penalty or TTL reward to the post's expiresAt.
 *  4. Check Bloom threshold → trigger reveal if met.
 *  5. Award FUEL to the viewer for organic watching (anti-farming safe).
 */

import { prisma } from '@/lib/db';
import {
  ARENA_MAX_TTL_SECONDS,
  calculateDiminishingRate,
  calculateEffectiveContribution,
  calculateTtlDelta,
  clampArenaMaxTtl,
  getRemainingTtlSeconds,
  BOUNCE_THRESHOLD_MS,
  REWARD_THRESHOLD_MS,
} from '@/lib/arena-engine';
import { creditWallet } from './wallet';
import { settleAllBets } from './scouts';
import { createNotification } from './notifications';

// FUEL earned per second of active (non-bounce) viewing, before diminishing returns
const FUEL_PER_SECOND_OF_VIEWING = 0.01;

export interface PresenceEventResult {
  status: 'bounce' | 'neutral' | 'rewarded' | 'capped';
  ttlDeltaSeconds: number;
  effectiveContributionMs: number;
  diminishingRate: number;
  bloomed: boolean;
  fuelEarned: number;
}

/**
 * Process a single completed long-press presence event.
 *
 * @param userId      The viewer.
 * @param postId      The post being viewed.
 * @param durationMs  Duration of the long-press in milliseconds.
 */
export async function processPresenceEvent(
  userId: string,
  postId: string,
  durationMs: number
): Promise<PresenceEventResult> {
  return prisma.$transaction(async (tx) => {
    // ── 1. Load post ──────────────────────────────────────────────────────────
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        expiresAt: true,
        is_revealed: true,
        is_crystallised: true,
        is_expired: true,
        arena_state: true,
        total_presence_ms: true,
        threshold_presence_ms: true,
        authorId: true,
      },
    });

    if (!post || post.is_expired) {
      return {
        status: 'capped' as const,
        ttlDeltaSeconds: 0,
        effectiveContributionMs: 0,
        diminishingRate: 0,
        bloomed: false,
        fuelEarned: 0,
      };
    }

    // ── 2. Load or create PresenceTracking record ─────────────────────────────
    let tracking = await tx.presenceTracking.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (!tracking) {
      tracking = await tx.presenceTracking.create({
        data: { userId, postId },
      });
    }

    // ── 3. Check if user has already hit their contribution cap ───────────────
    const currentTtlSeconds = post.expiresAt
      ? getRemainingTtlSeconds(post.expiresAt)
      : 300; // fallback 5 minutes

    const effectiveContributionMs = calculateEffectiveContribution(
      durationMs,
      tracking.total_duration_ms,
      tracking.contribution_to_ttl_ms,
      currentTtlSeconds
    );

    const isCapped = tracking.max_contribution_reached;
    const newDiminishingRate = calculateDiminishingRate(
      tracking.total_duration_ms + durationMs
    );

    // ── 4. Compute TTL delta ──────────────────────────────────────────────────
    const ttlDelta = isCapped ? 0 : calculateTtlDelta(durationMs, effectiveContributionMs);

    let status: PresenceEventResult['status'];
    if (isCapped) {
      status = 'capped';
    } else if (durationMs < BOUNCE_THRESHOLD_MS) {
      status = 'bounce';
    } else if (durationMs >= REWARD_THRESHOLD_MS) {
      status = 'rewarded';
    } else {
      status = 'neutral';
    }

    // ── 5. Update post TTL ────────────────────────────────────────────────────
    let newTotalPresenceMs = post.total_presence_ms;
    let bloomed = false;

    if (post.expiresAt && !post.is_crystallised) {
      const currentRemainingSeconds = getRemainingTtlSeconds(post.expiresAt);
      const rawNewTtl = currentRemainingSeconds + ttlDelta;
      const clampedTtl = clampArenaMaxTtl(rawNewTtl);

      // Only count positive-contribution events toward the Bloom threshold
      if (status === 'rewarded' && !isCapped) {
        newTotalPresenceMs += effectiveContributionMs;
      }

      await tx.post.update({
        where: { id: postId },
        data: {
          expiresAt: new Date(Date.now() + clampedTtl * 1_000),
          total_presence_ms: newTotalPresenceMs,
        },
      });

      // ── 6. Check Bloom ──────────────────────────────────────────────────────
      if (
        !post.is_revealed &&
        newTotalPresenceMs >= post.threshold_presence_ms
      ) {
        await tx.post.update({
          where: { id: postId },
          data: {
            is_revealed: true,
            arena_state: 'revealed',
          },
        });
        bloomed = true;
      }
    }

    // ── 7. Update PresenceTracking ────────────────────────────────────────────
    const newTotalDuration = tracking.total_duration_ms + durationMs;
    const newContrib = tracking.contribution_to_ttl_ms + effectiveContributionMs;
    // Max contribution check: has user now spent >= 120% of post TTL?
    const maxContrib = currentTtlSeconds * 1_000 * 1.2;
    const newMaxReached = newContrib >= maxContrib;

    await tx.presenceTracking.update({
      where: { id: tracking.id },
      data: {
        total_duration_ms: newTotalDuration,
        contribution_to_ttl_ms: newContrib,
        diminishing_rate: newDiminishingRate,
        max_contribution_reached: newMaxReached,
      },
    });

    // ── 8. Award FUEL for organic viewing (only for rewarded, non-capped) ─────
    let fuelEarned = 0;
    if (status === 'rewarded' && !isCapped) {
      const earnAmount = (durationMs / 1_000) * FUEL_PER_SECOND_OF_VIEWING;
      fuelEarned = await creditWallet(
        userId,
        earnAmount,
        `Arena viewing — post ${postId}`,
        'earn',
        postId,
        true // apply daily faucet cap
      );
    }

    // ── 9. Settle bets if Bloom just happened ─────────────────────────────────
    if (bloomed) {
      // Fire-and-forget (outside transaction to avoid long locks)
      void settleAllBets(postId, post.authorId).catch(console.error);

      // Notify author
      void createNotification({
        userId: post.authorId,
        type: 'bloom',
        title: 'Your post has bloomed! 🌸',
        body: 'The crowd has uncovered your identity. Scouts are being paid out.',
        postId,
      }).catch(console.error);
    }

    return {
      status,
      ttlDeltaSeconds: ttlDelta,
      effectiveContributionMs,
      diminishingRate: newDiminishingRate,
      bloomed,
      fuelEarned,
    };
  });
}
