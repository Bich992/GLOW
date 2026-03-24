export type Wave = { id: string; label: string; start: number; end: number };

export const WAVES: Wave[] = [
  { id: 'morning',   label: '🌅 Mattina',    start:  7, end: 11 },
  { id: 'afternoon', label: '☀️ Pomeriggio', start: 13, end: 17 },
  { id: 'evening',   label: '🌙 Sera',       start: 20, end: 24 },
];

/** Returns the active wave for a given local hour (0–23), or null if between waves. */
export function getActiveWave(localHour: number): Wave | null {
  return WAVES.find((w) => localHour >= w.start && localHour < w.end) ?? null;
}

/** Returns minutes until the next wave starts. */
export function minutesToNextWave(localHour: number, localMinute: number): number {
  const totalMinutes = localHour * 60 + localMinute;

  for (const wave of WAVES) {
    const waveStart = wave.start * 60;
    if (waveStart > totalMinutes) {
      return waveStart - totalMinutes;
    }
  }

  // Next wave is tomorrow's first wave
  const firstWaveStart = WAVES[0].start * 60;
  return 24 * 60 - totalMinutes + firstWaveStart;
}
