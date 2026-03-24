/**
 * Unit tests for the Glow Engine (Task 1).
 * Tests the computeExpiresAt formula and crystallisation logic.
 */

import {
  computeExpiresAt,
  BASE_TTL_SECONDS,
  BASE_TTL_OFF_WAVE,
  MAX_LIFETIME_HOURS,
  FUEL_WEIGHTS,
} from '../../src/lib/glow-engine';

describe('computeExpiresAt', () => {
  const bornAt = new Date('2026-01-01T00:00:00.000Z');
  const defaultAuthorTrust = 50; // repMultiplier = 1.0

  it('returns base TTL (1h) when fuel_points_total = 0 and born during wave', () => {
    const result = computeExpiresAt({
      bornAt,
      currentFuelPoints: 0,
      authorGlowTrust: defaultAuthorTrust,
      bornDuringWave: true,
    });

    // log10(1 + 0) = 0, so extension = 0 → total = BASE_TTL_SECONDS
    const expectedMs = bornAt.getTime() + BASE_TTL_SECONDS * 1000;
    expect(result.getTime()).toBe(expectedMs);
  });

  it('returns ~2h life after fuel_points_total = 10 (born during wave, trust=50)', () => {
    const result = computeExpiresAt({
      bornAt,
      currentFuelPoints: 10,
      authorGlowTrust: defaultAuthorTrust,
      bornDuringWave: true,
    });

    // repMultiplier = clamp(0.5, 2.0, 50/50) = 1.0
    // extension = 3600 * log10(11) * 1.0 ≈ 3600 * 1.0414 ≈ 3749s
    // total ≈ 3600 + 3749 = 7349s ≈ ~2h
    const totalSec = (result.getTime() - bornAt.getTime()) / 1000;
    expect(totalSec).toBeGreaterThan(7000); // at least ~1.9h
    expect(totalSec).toBeLessThan(7500);    // at most ~2.1h
  });

  it('returns shorter TTL (1800s base) when born off-wave with 0 fuel', () => {
    const result = computeExpiresAt({
      bornAt,
      currentFuelPoints: 0,
      authorGlowTrust: defaultAuthorTrust,
      bornDuringWave: false,
    });

    const expectedMs = bornAt.getTime() + BASE_TTL_OFF_WAVE * 1000;
    expect(result.getTime()).toBe(expectedMs);
  });

  it('enforces MAX_LIFETIME_HOURS (72h) hard cap', () => {
    const result = computeExpiresAt({
      bornAt,
      currentFuelPoints: 999_999,
      authorGlowTrust: 100,
      bornDuringWave: true,
    });

    const maxMs = bornAt.getTime() + MAX_LIFETIME_HOURS * 3600 * 1000;
    expect(result.getTime()).toBeLessThanOrEqual(maxMs);
  });

  it('uses halved base TTL for low-trust authors (glow_trust < 25)', () => {
    const result = computeExpiresAt({
      bornAt,
      currentFuelPoints: 0,
      authorGlowTrust: 10,
      bornDuringWave: true,
    });

    // glow_trust < 25 → baseTtl = BASE_TTL_SECONDS / 2 = 1800
    const expectedMs = bornAt.getTime() + (BASE_TTL_SECONDS / 2) * 1000;
    expect(result.getTime()).toBe(expectedMs);
  });

  it('reputation multiplier clamps to 2.0 for trust=100', () => {
    const highTrust = computeExpiresAt({
      bornAt,
      currentFuelPoints: 10,
      authorGlowTrust: 100,
      bornDuringWave: true,
    });
    const normalTrust = computeExpiresAt({
      bornAt,
      currentFuelPoints: 10,
      authorGlowTrust: 50,
      bornDuringWave: true,
    });

    // High trust should give more lifetime
    expect(highTrust.getTime()).toBeGreaterThan(normalTrust.getTime());
  });
});

describe('FUEL_WEIGHTS', () => {
  it('has expected weight values', () => {
    expect(FUEL_WEIGHTS.like).toBe(0.1);
    expect(FUEL_WEIGHTS.comment).toBe(0.3);
    expect(FUEL_WEIGHTS.boost_per_fuel).toBe(1.0);
    expect(FUEL_WEIGHTS.echo).toBe(0.5);
    expect(FUEL_WEIGHTS.tip_received).toBe(0.5);
  });
});
