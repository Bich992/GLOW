export const LIFETIME_DELTAS_MS = {
  like:    5  * 60 * 1000,  // +5 min
  comment: 15 * 60 * 1000,  // +15 min (only if body.length >= 20)
  boost:   60 * 60 * 1000,  // +1 h
  echo:    30 * 60 * 1000,  // +30 min
} as const;

export type LifetimeAction = keyof typeof LIFETIME_DELTAS_MS;
