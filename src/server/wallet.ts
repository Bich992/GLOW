import { prisma } from '@/lib/db';
import { applyDailyFaucetCap } from './economy';

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });
  if (!wallet) throw new Error('Wallet not found');
  return wallet;
}

export async function getTransactions(userId: string, limit = 50, offset = 0) {
  return prisma.tokenTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      post: {
        select: { id: true, content: true },
      },
    },
  });
}

export async function debitWallet(
  userId: string,
  amount: number,
  description: string,
  postId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.balance < amount) throw new Error('Insufficient balance');

    const newBalance = wallet.balance - amount;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type: 'spend',
        amount: -amount,
        balanceAfter: newBalance,
        description,
        postId,
      },
    });
  });
}

export async function creditWallet(
  userId: string,
  amount: number,
  description: string,
  type: string = 'earn',
  postId?: string,
  applyFaucetCap = true
): Promise<number> {
  let actualAmount = amount;

  if (applyFaucetCap && type === 'earn') {
    actualAmount = await applyDailyFaucetCap(userId, amount);
    if (actualAmount <= 0) return 0;
  }

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');

    const newBalance = wallet.balance + actualAmount;

    // Reset daily counter if new day
    const now = new Date();
    const resetAt = new Date(wallet.earnResetAt);
    const isNewDay =
      now.getFullYear() !== resetAt.getFullYear() ||
      now.getMonth() !== resetAt.getMonth() ||
      now.getDate() !== resetAt.getDate();

    const newEarnedToday = isNewDay
      ? type === 'earn' ? actualAmount : 0
      : type === 'earn'
        ? wallet.earnedToday + actualAmount
        : wallet.earnedToday;

    await tx.wallet.update({
      where: { userId },
      data: {
        balance: newBalance,
        earnedToday: newEarnedToday,
        earnResetAt: isNewDay ? now : wallet.earnResetAt,
      },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type,
        amount: actualAmount,
        balanceAfter: newBalance,
        description,
        postId,
      },
    });
  });

  return actualAmount;
}
