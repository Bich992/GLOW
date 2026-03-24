/**
 * Profile Temperature — a rolling activity score (0–120+).
 *
 * Formula (computed every hour by the cron worker):
 *   rawScore = (postsLast48h * 10) + (interactionsSent * 2) + (fuelReceivedLast48h * 1.5)
 *   temperature = clamp(0, 120, rawScore)  // can exceed 100 in burst events
 *
 * Decay rule: if lastActiveAt < (now - 24h), temperature *= 0.5 (once per day)
 *
 * States:
 *   COLD     temperature <  30
 *   GLOWING  temperature >= 30 && < 70
 *   ON_FIRE  temperature >= 70
 */

export type TempState = 'COLD' | 'GLOWING' | 'ON_FIRE';

export function getTempState(temperature: number): TempState {
  if (temperature >= 70) return 'ON_FIRE';
  if (temperature >= 30) return 'GLOWING';
  return 'COLD';
}

export function applyDecay(current: number, lastActiveAt: Date): number {
  const hoursInactive = (Date.now() - lastActiveAt.getTime()) / 3_600_000;
  return hoursInactive >= 24 ? current * 0.5 : current;
}

export function computeTemperature(params: {
  postsLast48h: number;
  interactionsSent: number;
  fuelReceivedLast48h: number;
  lastActiveAt: Date;
}): number {
  const { postsLast48h, interactionsSent, fuelReceivedLast48h, lastActiveAt } = params;
  const raw = postsLast48h * 10 + interactionsSent * 2 + fuelReceivedLast48h * 1.5;
  const clamped = Math.min(120, Math.max(0, raw));
  return applyDecay(clamped, lastActiveAt);
}
