import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { isDemoMode, SESSION_COOKIE, createDemoSessionToken, DEMO_USERS } from '@/lib/auth';

const sessionSchema = z.object({
  idToken: z.string().optional(),
  demoUserId: z.string().optional(),
  username: z.string().optional(),
});

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { idToken, demoUserId, username } = parsed.data;

    // Demo session
    if (demoUserId || (isDemoMode() && username)) {
      const targetId = demoUserId ?? DEMO_USERS[username as keyof typeof DEMO_USERS];
      if (!targetId) {
        return NextResponse.json({ error: 'Invalid demo user' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { id: targetId } });
      if (!user) {
        return NextResponse.json({ error: 'Demo user not found' }, { status: 404 });
      }

      const sessionToken = createDemoSessionToken(targetId);
      cookies().set(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: FIVE_DAYS_MS / 1000,
        path: '/',
      });

      return NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
    }

    // Firebase session
    if (idToken) {
      const { verifyIdToken, createSessionCookie } = await import('@/features/firebase/auth');
      const decoded = await verifyIdToken(idToken);

      if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      // Find or create user
      let user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });

      if (!user) {
        // Create user from Firebase data
        const email = decoded.email ?? `${decoded.uid}@firebase.user`;
        const baseUsername = (decoded.name ?? decoded.uid)
          .toLowerCase()
          .replace(/[^a-z0-9_.]/g, '_')
          .slice(0, 20);

        let username = baseUsername;
        let attempts = 0;
        while (await prisma.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${++attempts}`;
        }

        user = await prisma.user.create({
          data: {
            firebaseUid: decoded.uid,
            email,
            username,
            displayName: decoded.name ?? username,
            avatarUrl: decoded.picture,
            emailVerified: true,
            profile: { create: {} },
            wallet: { create: { balance: 10 } },
          },
        });

        // Create welcome transaction
        const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
        if (wallet) {
          await prisma.tokenTransaction.create({
            data: {
              userId: user.id,
              walletId: wallet.id,
              type: 'faucet',
              amount: 10,
              balanceAfter: 10,
              description: 'Welcome bonus',
            },
          });
        }
      }

      // Create Firebase session cookie
      const sessionCookie = await createSessionCookie(idToken, FIVE_DAYS_MS);

      if (!sessionCookie) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }

      cookies().set(SESSION_COOKIE, sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: FIVE_DAYS_MS / 1000,
        path: '/',
      });

      return NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      });
    }

    return NextResponse.json({ error: 'Must provide idToken or demoUserId' }, { status: 400 });
  } catch (e) {
    console.error('Session creation error:', e);
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return NextResponse.json({ success: true });
}
