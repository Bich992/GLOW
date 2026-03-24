/**
 * POST /api/auth/sync
 * Called by the client right after a successful Supabase sign-in or sign-up.
 * Ensures the Supabase user exists in our Prisma database with a wallet.
 * Returns the full user+wallet object needed by AuthProvider.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSupabaseServerClient } from '@/features/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: { user: supaUser }, error } = await supabase.auth.getUser();
    if (error || !supaUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const meta = supaUser.user_metadata ?? {};
    const email = supaUser.email ?? `${supaUser.id}@supabase.user`;

    // Find existing user by supabase UID (stored in firebaseUid for schema compatibility)
    let user = await prisma.user.findUnique({ where: { firebaseUid: supaUser.id } });

    if (!user) {
      // Also try by email in case they signed up via email previously
      user = await prisma.user.findUnique({ where: { email } });

      if (user && !user.firebaseUid) {
        // Link existing email user to their new Supabase account
        user = await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: supaUser.id },
        });
      }
    }

    if (!user) {
      // New user — pick a unique username
      const rawUsername = (meta.username ?? meta.name ?? email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, '_')
        .slice(0, 20);

      let username = rawUsername;
      let attempts = 0;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${rawUsername}${++attempts}`;
      }

      const displayName = meta.displayName ?? meta.full_name ?? meta.name ?? username;

      user = await prisma.user.create({
        data: {
          firebaseUid: supaUser.id,
          email,
          username,
          displayName,
          avatarUrl: meta.avatar_url ?? null,
          emailVerified: !!supaUser.email_confirmed_at,
          welcome_bonus_given: true,
          profile: { create: {} },
          wallet: { create: { balance: 5 } },
        },
      });

      // Welcome bonus transaction
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      if (wallet) {
        await prisma.tokenTransaction.create({
          data: {
            userId: user.id,
            walletId: wallet.id,
            type: 'faucet',
            amount: 5,
            balanceAfter: 5,
            description: 'Benvenuto su GLOW! 🔥',
          },
        });
      }
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isDemo: false,
        wallet: wallet
          ? {
              id: wallet.id,
              balance: wallet.balance,
              earnedToday: wallet.earnedToday,
              earnResetAt: wallet.earnResetAt.toISOString(),
            }
          : undefined,
      },
    });
  } catch (e) {
    console.error('Auth sync error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
