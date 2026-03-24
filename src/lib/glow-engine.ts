/**
 * Glow Engine — single source of truth for all post lifetime calculations.
 *
 * Formula:
 *   extension = base_ttl * log10(1 + fuelPoints) * reputationMultiplier
 *
 * Where:
 *   base_ttl              = 3600s (1 hour, born inside a Wave) | 1800s (off-wave)
 *   fuelPoints            = total FUEL invested in the post (likes*0.1 + comments*0.3 + boosts + echoes*0.5)
 *   reputationMultiplier  = clamp(0.5, 2.0, author.glow_trust / 50)
 *
 * Hard cap: expires_at - born_at must never exceed MAX_LIFETIME_HOURS (72h).
 */

export const MAX_LIFETIME_HOURS = 72;
export const BASE_TTL_SECONDS = 3600;
export const BASE_TTL_OFF_WAVE = 1800;

/** Fuel weight per interaction type. */
export const FUEL_WEIGHTS = {
  like: 0.1,
  comment: 0.3, // only if body.length >= 20
  boost_per_fuel: 1.0, // 1 FUEL spent = 1.0 fuel_point
  echo: 0.5,
  tip_received: 0.5,
} as const;

export type FuelInteraction = keyof typeof FUEL_WEIGHTS;

/**
 * Computes the new expiresAt for a post given its current state.
 *
 * The log10 curve ensures:
 *   - First 10 FUEL points have strong impact
 *   - Beyond 100 FUEL points, gains plateau (post cannot live forever)
 *   - Maximum realistic lifetime: ~72h (enforced hard cap)
 */
export function computeExpiresAt(params: {
  bornAt: Date;
  currentFuelPoints: number;
  authorGlowTrust: number;
  bornDuringWave: boolean;
}): Date {
  const { bornAt, currentFuelPoints, authorGlowTrust, bornDuringWave } = params;

  let baseTtl = bornDuringWave ? BASE_TTL_SECONDS : BASE_TTL_OFF_WAVE;

  // Trust penalty: low-trust authors get halved base TTL
  if (authorGlowTrust < 25) {
    baseTtl = BASE_TTL_SECONDS / 2;
  }

  const repMultiplier = Math.min(2.0, Math.max(0.5, authorGlowTrust / 50));
  const extensionSec = baseTtl * Math.log10(1 + currentFuelPoints) * repMultiplier;
  const totalSec = Math.min(baseTtl + extensionSec, MAX_LIFETIME_HOURS * 3600);

  return new Date(bornAt.getTime() + totalSec * 1000);
}

/**
 * Returns the fuel weight for a given interaction.
 * Returns 0 for unknown interaction types.
 */
export function getFuelWeight(interaction: FuelInteraction): number {
  return FUEL_WEIGHTS[interaction];
}
