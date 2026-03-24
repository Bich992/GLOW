import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json(null, { status: 200 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isDemo: user.isDemoUser,
      wallet: wallet
        ? {
            id: wallet.id,
            balance: wallet.balance,
            earnedToday: wallet.earnedToday,
            earnResetAt: wallet.earnResetAt.toISOString(),
          }
        : undefined,
    });
  } catch (e) {
    return NextResponse.json(null, { status: 200 });
  }
}
