/**
 * Unit tests for the Profile Temperature system (Task 2).
 */

import { computeTemperature, getTempState, applyDecay } from '../../src/lib/temperature';

describe('getTempState', () => {
  it('returns COLD for temperature < 30', () => {
    expect(getTempState(0)).toBe('COLD');
    expect(getTempState(29)).toBe('COLD');
  });

  it('returns GLOWING for temperature >= 30 and < 70', () => {
    expect(getTempState(30)).toBe('GLOWING');
    expect(getTempState(50)).toBe('GLOWING');
    expect(getTempState(69)).toBe('GLOWING');
  });

  it('returns ON_FIRE for temperature >= 70', () => {
    expect(getTempState(70)).toBe('ON_FIRE');
    expect(getTempState(82)).toBe('ON_FIRE');
    expect(getTempState(120)).toBe('ON_FIRE');
  });
});

describe('applyDecay', () => {
  it('returns half the temperature if lastActiveAt > 24h ago', () => {
    const staleDate = new Date(Date.now() - 25 * 3_600_000);
    expect(applyDecay(80, staleDate)).toBe(40);
  });

  it('returns unchanged temperature if lastActiveAt < 24h ago', () => {
    const recentDate = new Date(Date.now() - 12 * 3_600_000);
    expect(applyDecay(80, recentDate)).toBe(80);
  });
});

describe('computeTemperature', () => {
  it('computes correct temperature for sample inputs (acceptance criterion)', () => {
    // postsLast48h = 5 → 5 * 10 = 50
    // interactionsSent = 10 → 10 * 2 = 20
    // fuelReceivedLast48h = 8 → 8 * 1.5 = 12
    // raw = 82 → ON_FIRE
    const recentDate = new Date(Date.now() - 1 * 3_600_000); // 1h ago, no decay

    const temp = computeTemperature({
      postsLast48h: 5,
      interactionsSent: 10,
      fuelReceivedLast48h: 8,
      lastActiveAt: recentDate,
    });

    expect(temp).toBe(82);
    expect(getTempState(temp)).toBe('ON_FIRE');
  });

  it('clamps temperature to 120 maximum', () => {
    const recentDate = new Date(Date.now() - 1_000);
    const temp = computeTemperature({
      postsLast48h: 100,
      interactionsSent: 100,
      fuelReceivedLast48h: 100,
      lastActiveAt: recentDate,
    });

    expect(temp).toBeLessThanOrEqual(120);
  });

  it('applies decay when user was inactive for > 24h', () => {
    const staleDate = new Date(Date.now() - 30 * 3_600_000); // 30h ago
    const temp = computeTemperature({
      postsLast48h: 5,
      interactionsSent: 10,
      fuelReceivedLast48h: 8,
      lastActiveAt: staleDate,
    });

    expect(temp).toBe(41); // 82 * 0.5 = 41
  });
});
