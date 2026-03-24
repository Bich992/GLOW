import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { Toaster } from '@/components/ui/toaster';
import { TopNav } from '@/components/layout/TopNav';
import { BottomNav } from '@/components/layout/BottomNav';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { AuthUser } from '@/types';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'GLOW — Ephemeral Posts That Matter',
    template: '%s | GLOW',
  },
  description: 'Share fleeting moments. Every post lives and grows through interaction. Boost, tip, and earn FUEL tokens.',
  keywords: ['social media', 'ephemeral', 'posts', 'glow', 'FUEL'],
  openGraph: {
    type: 'website',
    siteName: 'GLOW',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Load session on the server for initial state
  let initialUser: AuthUser | null = null;
  try {
    const user = await getServerSession();
    if (user) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      initialUser = {
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
      };
    }
  } catch {
    // Server session load failure is non-fatal
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <LanguageProvider>
            <AuthProvider initialUser={initialUser}>
              <div className="min-h-screen flex flex-col">
                <TopNav />
                <div className="flex-1">
                  {children}
                </div>
                <BottomNav />
              </div>
              <Toaster />
            </AuthProvider>
            </LanguageProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
