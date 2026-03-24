'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { DemoLoginButton } from './DemoLoginButton';

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(/^[a-z0-9_.]+$/, 'Only lowercase letters, numbers, dots and underscores allowed'),
  displayName: z.string().min(1, 'Display name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  birthDate: z.string().refine((val) => {
    const date = new Date(val);
    const age = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 16;
  }, 'You must be at least 16 years old'),
});

type SignupFormData = z.infer<typeof signupSchema>;

function isSupabaseMode() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', displayName: '', email: '', password: '', birthDate: '' },
  });

  const handleSubmit = async (data: SignupFormData) => {
    // Demo mode guard
    const demoMode =
      !isSupabaseMode() &&
      (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

    if (demoMode) {
      toast({
        title: 'Demo mode active',
        description: 'Use the demo login buttons to try Timely',
      });
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseMode()) {
        // ── Supabase signup ─────────────────────────────────────────
        const { getSupabaseClient } = await import('@/features/supabase/client');
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase not configured');

        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            // Store username & displayName in user_metadata so our sync endpoint can read them
            data: {
              username: data.username,
              displayName: data.displayName,
            },
          },
        });

        if (error) throw new Error(error.message);

        // Sign in immediately after sign-up (Supabase may auto-confirm or require email verify)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (!signInError) {
          // Sync user to Prisma DB
          await fetch('/api/auth/sync', { method: 'POST' });
          router.push('/feed');
        } else {
          // Email confirmation required
          toast({
            title: 'Check your email!',
            description: 'We sent a confirmation link. Click it then sign in.',
          });
          router.push('/login');
        }
      } else {
        // ── Firebase signup ─────────────────────────────────────────
        const { getFirebaseApp } = await import('@/features/firebase/client');
        const app = getFirebaseApp();
        if (!app) throw new Error('Firebase not configured');

        const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const auth = getAuth(app);
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
        await updateProfile(cred.user, { displayName: data.displayName });
        const idToken = await cred.user.getIdToken();

        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) throw new Error('Failed to create session');
        router.push('/feed');
      }
    } catch (e) {
      toast({
        title: 'Sign up failed',
        description: e instanceof Error ? e.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Join Timely and start sharing ephemeral moments</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <DemoLoginButton />

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or sign up with email</span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="alice_wonder" {...form.register('username')} />
            {form.formState.errors.username && (
              <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" placeholder="Alice Wonder" {...form.register('displayName')} />
            {form.formState.errors.displayName && (
              <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Min 8 characters" {...form.register('password')} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate">Date of Birth</Label>
            <Input id="birthDate" type="date" {...form.register('birthDate')} />
            {form.formState.errors.birthDate && (
              <p className="text-xs text-destructive">{form.formState.errors.birthDate.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Must be 16+ to use Timely</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
            Create Account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
