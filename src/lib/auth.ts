import { cookies } from 'next/headers';
import { prisma } from './db';
import type { User } from '@prisma/client';

export const DEMO_USERS = {
  alice: 'user_alice',
  bob: 'user_bob',
  charlie: 'user_charlie',
} as const;

export const SESSION_COOKIE = 'timely_session';
export const DEMO_SESSION_PREFIX = 'demo_';

export interface SessionPayload {
  userId: string;
  isDemo: boolean;
}

export function isDemoMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
  );
}

export function isSupabaseMode(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function parseDemoSession(sessionToken: string): SessionPayload | null {
  if (!sessionToken.startsWith(DEMO_SESSION_PREFIX)) return null;
  const userId = sessionToken.slice(DEMO_SESSION_PREFIX.length);
  const validIds = Object.values(DEMO_USERS) as string[];
  if (!validIds.includes(userId)) return null;
  return { userId, isDemo: true };
}

export async function getServerSession(): Promise<User | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  // ── Supabase auth ────────────────────────────────────────────────
  if (isSupabaseMode()) {
    try {
      const { getSupabaseServerClient } = await import('@/features/supabase/server');
      const supabase = getSupabaseServerClient();
      if (!supabase) return null;

      const { data: { user: supaUser }, error } = await supabase.auth.getUser();
      if (error || !supaUser) return null;

      // Look up by supabase UID (stored in firebaseUid column for compatibility)
      const user = await prisma.user.findUnique({ where: { firebaseUid: supaUser.id } });
      return user;
    } catch {
      return null;
    }
  }

  // ── Demo mode ────────────────────────────────────────────────────
  if (!sessionCookie?.value) {
    if (isDemoMode()) {
      return prisma.user.findUnique({ where: { id: DEMO_USERS.alice } });
    }
    return null;
  }

  const token = sessionCookie.value;

  if (token.startsWith(DEMO_SESSION_PREFIX)) {
    const session = parseDemoSession(token);
    if (!session) return null;
    return prisma.user.findUnique({ where: { id: session.userId } });
  }

  // ── Firebase legacy fallback ─────────────────────────────────────
  try {
    const { verifySessionToken } = await import('@/features/firebase/auth');
    const decoded = await verifySessionToken(token);
    if (!decoded) return null;
    return prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getServerSession();
  if (!user) throw new Error('Unauthorized');
  if (user.isSuspended && user.suspendedUntil && user.suspendedUntil > new Date()) {
    throw new Error('Account suspended');
  }
  return user;
}

export function createDemoSessionToken(userId: string): string {
  return `${DEMO_SESSION_PREFIX}${userId}`;
}
