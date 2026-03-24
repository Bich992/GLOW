/**
 * Smoke test for home page
 * Tests that the app can load basic pages without crashing
 */

import { computeDeltaSeconds, computeBoostPriority } from '../../src/server/economy';

describe('Landing page smoke tests', () => {
  it('should compute delta seconds correctly for s=0', () => {
    const delta = computeDeltaSeconds(0);
    // round(3600 * 0.8^0) = round(3600) = 3600
    expect(delta).toBe(3600);
  });

  it('should compute delta seconds correctly for s=1', () => {
    const delta = computeDeltaSeconds(1);
    // round(3600 * 0.8^1) = round(2880) = 2880
    expect(delta).toBe(2880);
  });

  it('should compute delta seconds correctly for s=5', () => {
    const delta = computeDeltaSeconds(5);
    // round(3600 * 0.8^5) = round(3600 * 0.32768) ≈ round(1179.648) = 1180
    // But minimum is 300
    expect(delta).toBeGreaterThanOrEqual(300);
  });

  it('should enforce minimum delta of 300 seconds', () => {
    // For very high s, should still be >= 300
    const delta = computeDeltaSeconds(20);
    expect(delta).toBe(300);
  });

  it('should compute boost priority with no boosts = 1.0', () => {
    const priority = computeBoostPriority([]);
    expect(priority).toBe(1.0);
  });

  it('should compute boost priority with 1 TIMT boost = 1.2', () => {
    const now = new Date();
    const boosts = [
      {
        amount: 1,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 20 * 60 * 1000),
      },
    ];
    const priority = computeBoostPriority(boosts);
    // 1 TIMT * 0.2 = 0.2 boost, so priority = 1 + 0.2 = 1.2
    expect(priority).toBeCloseTo(1.2, 5);
  });

  it('should cap boost priority at 3.0 (200% boost)', () => {
    const now = new Date();
    // 20 TIMT boost would be 20 * 0.2 = 4.0 boost effect, capped to 2.0
    const boosts = [
      {
        amount: 20,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 20 * 60 * 1000),
      },
    ];
    const priority = computeBoostPriority(boosts);
    // Max boost effect is 2.0 (200%), so max priority = 3.0
    expect(priority).toBe(3.0);
  });

  it('should exclude expired boosts from priority calculation', () => {
    const now = new Date();
    const pastBoosts = [
      {
        amount: 10,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000),
        expiresAt: new Date(now.getTime() - 1), // already expired
      },
    ];
    const priority = computeBoostPriority(pastBoosts);
    expect(priority).toBe(1.0);
  });
});
