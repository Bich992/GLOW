'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateWalletBalance: (delta: number) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signInAsDemo: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
  updateWalletBalance: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function isSupabaseMode() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** After a successful Supabase auth event, sync the user to our DB */
async function syncSupabaseUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/sync', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children, initialUser }: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);

  const refreshUser = useCallback(async () => {
    const u = await fetchCurrentUser();
    setUser(u);
  }, []);

  const updateWalletBalance = useCallback((delta: number) => {
    setUser((prev) => {
      if (!prev || !prev.wallet) return prev;
      return {
        ...prev,
        wallet: { ...prev.wallet, balance: Math.max(0, prev.wallet.balance + delta) },
      };
    });
  }, []);

  // ── Supabase auth state listener ─────────────────────────────────
  useEffect(() => {
    if (!isSupabaseMode()) {
      if (initialUser === undefined) refreshUser().finally(() => setLoading(false));
      else setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { getSupabaseClient } = await import('@/features/supabase/client');
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Initial session
      const { data: { user: supaUser } } = await supabase.auth.getUser();
      if (supaUser && mounted) {
        const appUser = await syncSupabaseUser();
        if (mounted) setUser(appUser);
      } else if (!supaUser && initialUser && mounted) {
        // SSR provided initial user but Supabase says no session — trust SSR
        setUser(initialUser);
      }
      if (mounted) setLoading(false);

      // Listen for future auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN') {
          const appUser = await syncSupabaseUser();
          if (mounted) setUser(appUser);
        } else if (event === 'SIGNED_OUT') {
          if (mounted) setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          // session refreshed silently — no UI change needed
        }
      });

      return () => { subscription.unsubscribe(); };
    })();

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── signIn ───────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    if (isSupabaseMode()) {
      const { getSupabaseClient } = await import('@/features/supabase/client');
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      // onAuthStateChange will handle syncing the user
      return;
    }

    // Demo mode fallback
    const isDemoMode =
      !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (isDemoMode) {
      await signInAsDemo(email.split('@')[0]);
      return;
    }

    // Firebase legacy
    const { getFirebaseApp } = await import('@/features/firebase/client');
    const app = getFirebaseApp();
    if (!app) throw new Error('Auth not configured');
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    const cred = await signInWithEmailAndPassword(getAuth(app), email, password);
    const idToken = await cred.user.getIdToken();
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error('Session creation failed');
    const data = await res.json();
    setUser({ ...data.user, isDemo: false });
  };

  // ── signInWithGoogle ─────────────────────────────────────────────
  const signInWithGoogle = async () => {
    if (isSupabaseMode()) {
      const { getSupabaseClient } = await import('@/features/supabase/client');
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not configured');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/feed` },
      });
      if (error) throw new Error(error.message);
      return;
    }

    // Demo fallback
    const { getFirebaseApp } = await import('@/features/firebase/client');
    const app = getFirebaseApp();
    if (!app) { await signInAsDemo('alice'); return; }
    const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const cred = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
    const idToken = await cred.user.getIdToken();
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error('Session creation failed');
    const data = await res.json();
    setUser({ ...data.user, isDemo: false });
  };

  // ── signInAsDemo ─────────────────────────────────────────────────
  const signInAsDemo = async (username: string) => {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) throw new Error('Demo login failed');
    const data = await res.json();
    setUser({ ...data.user, isDemo: true });
  };

  // ── signOut ──────────────────────────────────────────────────────
  const signOut = async () => {
    if (isSupabaseMode()) {
      const { getSupabaseClient } = await import('@/features/supabase/client');
      const supabase = getSupabaseClient();
      await supabase?.auth.signOut();
      setUser(null);
      return;
    }
    await fetch('/api/auth/session', { method: 'DELETE' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signInAsDemo, signOut, refreshUser, updateWalletBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
