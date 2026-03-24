import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(_request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ awarded: false, reason: 'unauthenticated' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, last_daily_bonus_at: true, login_streak: true },
    });

    if (!dbUser) {
      return NextResponse.json({ awarded: false, reason: 'user_not_found' });
    }

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let alreadyAwarded = false;
    if (dbUser.last_daily_bonus_at) {
      const lastBonus = new Date(dbUser.last_daily_bonus_at);
      const lastBonusDay = new Date(
        Date.UTC(lastBonus.getUTCFullYear(), lastBonus.getUTCMonth(), lastBonus.getUTCDate())
      );
      if (lastBonusDay.getTime() >= todayUTC.getTime()) {
        alreadyAwarded = true;
      }
    }

    if (alreadyAwarded) {
      return NextResponse.json({ awarded: false });
    }

    // Compute streak
    let newStreak = 1;
    if (dbUser.last_daily_bonus_at) {
      const lastBonus = new Date(dbUser.last_daily_bonus_at);
      const lastBonusDay = new Date(
        Date.UTC(lastBonus.getUTCFullYear(), lastBonus.getUTCMonth(), lastBonus.getUTCDate())
      );
      const yesterdayUTC = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);
      if (lastBonusDay.getTime() === yesterdayUTC.getTime()) {
        newStreak = (dbUser.login_streak ?? 0) + 1;
      }
    }

    const baseAmount = 0.5;
    const streakBonus = newStreak >= 3 ? 0.25 : 0;
    const totalAmount = baseAmount + streakBonus;

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet) throw new Error('Wallet not found');

      const newBalance = wallet.balance + totalAmount;
      await tx.wallet.update({ where: { userId: user.id }, data: { balance: newBalance } });
      await tx.tokenTransaction.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          type: 'earn',
          amount: totalAmount,
          balanceAfter: newBalance,
          description: streakBonus > 0
            ? `Daily login bonus (streak ${newStreak} 🔥)`
            : 'Daily login bonus',
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          last_daily_bonus_at: now,
          login_streak: newStreak,
          last_active_at: now,
        },
      });
    });

    return NextResponse.json({ awarded: true, amount: baseAmount, streakBonus, streak: newStreak });
  } catch (e) {
    console.error('Daily bonus error:', e);
    return NextResponse.json({ awarded: false, reason: 'error' });
  }
}
