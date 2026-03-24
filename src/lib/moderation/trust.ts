import type { ModerationMiddleware, ModerationResult } from './pipeline';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const MAX_TRUST = 100;
const MIN_TRUST = 0;

/** Blocks posts from users with 5+ trust strikes. */
export const trustMiddleware: ModerationMiddleware = async (
  _post,
  user
): Promise<ModerationResult> => {
  if (user.trust_strikes >= 5) {
    return {
      pass: false,
      reason: 'Account flagged for review.',
      code: 'TRUST_BLOCKED',
    };
  }
  return { pass: true };
};

// ─── Trust mutation helpers ───────────────────────────────────────────────────

/** A moderator confirms a report → penalise the reported user. */
export async function onReportConfirmed(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { glow_trust: true, trust_strikes: true },
  });
  if (!user) return;

  const newTrust = Math.max(MIN_TRUST, user.glow_trust - 10);
  const newStrikes = user.trust_strikes + 1;
  const flagged = newStrikes >= 5;

  await prisma.user.update({
    where: { id: userId },
    data: {
      glow_trust: flagged ? 0 : newTrust,
      trust_strikes: newStrikes,
      ...(flagged ? { isSuspended: true } : {}),
    },
  });

  if (flagged) {
    logger.warn('User flagged for manual review (5+ strikes)', { userId });
  }
}

/** A report was dismissed (false report) → penalise the reporter. */
export async function onReportDismissed(reporterId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: reporterId },
    data: { glow_trust: { decrement: 2 } },
  });

  // Re-clamp to min 0
  const user = await prisma.user.findUnique({
    where: { id: reporterId },
    select: { glow_trust: true },
  });
  if (user && user.glow_trust < MIN_TRUST) {
    await prisma.user.update({
      where: { id: reporterId },
      data: { glow_trust: MIN_TRUST },
    });
  }
}

/** A post reached crystallisation → reward the author's trust. */
export async function onPostCrystallised(authorId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: authorId },
    select: { glow_trust: true },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: authorId },
    data: { glow_trust: Math.min(MAX_TRUST, user.glow_trust + 5) },
  });
}

/**
 * Weekly decay cron helper — +1 trust for users with no strikes in the last 7 days.
 * Call from a cron route (e.g. /api/cron/trust-recovery).
 */
export async function weeklyTrustRecovery(): Promise<{ updated: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000);

  // Find users who had no moderation actions in the last 7 days
  const penalizedUserIds = await prisma.moderationAction.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { userId: true },
  });
  const penalizedIds = penalizedUserIds.map((m) => m.userId);

  const result = await prisma.user.updateMany({
    where: {
      id: { notIn: penalizedIds },
      trust_strikes: { equals: 0 },
      glow_trust: { lt: MAX_TRUST },
    },
    data: { glow_trust: { increment: 1 } },
  });

  // Re-clamp at MAX_TRUST
  await prisma.$executeRaw`
    UPDATE "User" SET "glow_trust" = ${MAX_TRUST} WHERE "glow_trust" > ${MAX_TRUST}
  `;

  return { updated: result.count };
}
