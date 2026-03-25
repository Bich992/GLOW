/**
 * Arena Engine — The Attention Economy.
 *
 * Governs:
 *   1. Real Presence Tracking (long-press viewing → TTL contribution)
 *   2. Bounce Rate Penalty  (<2 s view → 10× penalty on TTL)
 *   3. Diminishing Returns  (contribution rate slows with cumulative view time)
 *   4. Bloom Threshold      (dynamic presence target that reveals the author)
 *   5. Anti-Celebrity Coefficient (FUEL bet reward inversely proportional to fame)
 *   6. Attention Cap        (per-user contribution capped at 120 % of post TTL)
 */

// ── Hard limits ────────────────────────────────────────────────────────────────
/** Maximum TTL for an Arena post in seconds (12 hours). */
export const ARENA_MAX_TTL_SECONDS = 12 * 3600; // 43 200

// ── Bounce / Reward thresholds ─────────────────────────────────────────────────
/** Views shorter than this (ms) trigger the bounce penalty. */
export const BOUNCE_THRESHOLD_MS = 2_000;
/** Views longer than this (ms) reward the post with TTL. */
export const REWARD_THRESHOLD_MS = 5_000;
/** Bounce multiplier: 1 s of view < 2 s → removes 10 s of TTL. */
export const BOUNCE_PENALTY_MULTIPLIER = 10;

// ── Diminishing-returns windows ────────────────────────────────────────────────
const DR_FULL_UP_TO_MS = 5_000;   // 0–5 s:  rate 1.0
const DR_HALF_UP_TO_MS = 15_000;  // 5–15 s: rate 0.5
// > 15 s: rate 0.0

// ── Bloom base ─────────────────────────────────────────────────────────────────
const BLOOM_BASE_MS = 30_000; // 30 seconds of aggregate presence

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the current contribution rate for a user based on how long they have
 * already watched the post in total.
 *
 * 0–5 s   → 1.0 (full credit)
 * 5–15 s  → 0.5 (half credit)
 * 15 s+   → 0.0 (no credit — anti-farming)
 */
export function calculateDiminishingRate(totalDurationMs: number): number {
  if (totalDurationMs < DR_FULL_UP_TO_MS) return 1.0;
  if (totalDurationMs < DR_HALF_UP_TO_MS) return 0.5;
  return 0.0;
}

/**
 * Maximum milliseconds a single user may contribute to one post's TTL.
 * Formula: post_current_ttl_seconds × 1 000 × 1.2
 */
export function calculateMaxContribution(currentTtlSeconds: number): number {
  return currentTtlSeconds * 1_000 * 1.2;
}

/**
 * Calculates the effective (capped, diminished) contribution of a presence
 * event toward a post's TTL.
 *
 * @param rawDurationMs      Duration of this single press event.
 * @param prevTotalDurationMs Cumulative raw viewing time before this event.
 * @param currentContribMs   Cumulative TTL contribution before this event.
 * @param currentTtlSeconds  Current post TTL (for cap calculation).
 * @returns Contribution delta in milliseconds (clamped to 0+).
 */
export function calculateEffectiveContribution(
  rawDurationMs: number,
  prevTotalDurationMs: number,
  currentContribMs: number,
  currentTtlSeconds: number
): number {
  const maxContrib = calculateMaxContribution(currentTtlSeconds);
  if (currentContribMs >= maxContrib) return 0;

  const rate = calculateDiminishingRate(prevTotalDurationMs);
  if (rate === 0) return 0;

  const raw = rawDurationMs * rate;
  const remaining = maxContrib - currentContribMs;
  return Math.min(raw, remaining);
}

/**
 * Calculates the TTL delta (in seconds) for a completed long-press event.
 *
 * Bounce  (<2 s): −(duration_s × 10)
 * Neutral (2–5 s): 0
 * Reward  (≥5 s):  +contribution_ms / 1000
 *
 * Returned value is uncapped — callers must enforce ARENA_MAX_TTL_SECONDS.
 */
export function calculateTtlDelta(
  rawDurationMs: number,
  effectiveContributionMs: number
): number {
  if (rawDurationMs < BOUNCE_THRESHOLD_MS) {
    return -((rawDurationMs / 1_000) * BOUNCE_PENALTY_MULTIPLIER);
  }
  if (rawDurationMs >= REWARD_THRESHOLD_MS) {
    return effectiveContributionMs / 1_000;
  }
  return 0; // 2–5 s window: neutral
}

/**
 * Computes the dynamic Bloom presence threshold.
 *
 * Formula: base_ms × (1 + log10(max(DAU / 1000, 1)))
 *
 * At 1 000 DAU  → 30 s threshold
 * At 10 000 DAU → 60 s threshold
 * At 100 000 DAU → 90 s threshold
 */
export function calculateDynamicThreshold(dailyActiveUsers: number): number {
  const scalingFactor = 1 + Math.log10(Math.max(dailyActiveUsers / 1_000, 1));
  return Math.round(BLOOM_BASE_MS * scalingFactor);
}

/**
 * Anti-celebrity risk coefficient for scouting bets.
 *
 * Formula: 1 + (1 / log10(follower_count + 2))
 *
 * follower_count = 0        → coefficient ≈ 4.32  (very high risk, very high reward)
 * follower_count = 999      → coefficient ≈ 1.33
 * follower_count = 999 999  → coefficient ≈ 1.17
 */
export function calculateRiskCoefficient(followerCount: number): number {
  return 1 + 1 / Math.log10(followerCount + 2);
}

/**
 * Computes the potential payout for a scout bet.
 * potential_reward = fuel_invested × risk_coefficient
 */
export function calculatePotentialReward(
  fuelInvested: number,
  riskCoefficient: number
): number {
  return fuelInvested * riskCoefficient;
}

/**
 * Clamps a new TTL value between 0 and ARENA_MAX_TTL_SECONDS.
 * Only crystallised posts may exceed the cap (handled separately).
 */
export function clampArenaMaxTtl(newTtlSeconds: number): number {
  return Math.max(0, Math.min(newTtlSeconds, ARENA_MAX_TTL_SECONDS));
}

/**
 * Returns the remaining TTL (seconds) of a post given its current expiresAt.
 * Returns 0 if already expired.
 */
export function getRemainingTtlSeconds(expiresAt: Date): number {
  return Math.max(0, (expiresAt.getTime() - Date.now()) / 1_000);
}
