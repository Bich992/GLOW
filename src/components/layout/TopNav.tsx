'use client';

import React from 'react';
import Link from 'next/link';

import { Bell, PenSquare, Wallet, Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { TimtChip } from '@/components/posts/TimtChip';

export function TopNav() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="text-timt">✦</span>
          <span>GLOW</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              <TimtChip balance={user.wallet?.balance} />

              <Button variant="ghost" size="icon" asChild>
                <Link href="/posts/new" aria-label={t.nav.newPost}>
                  <PenSquare className="h-5 w-5" />
                </Link>
              </Button>

              <Button variant="ghost" size="icon" asChild>
                <Link href="/notifications" aria-label={t.nav.notifications}>
                  <Bell className="h-5 w-5" />
                </Link>
              </Button>
            </>
          )}

          {/* Language toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === 'en' ? 'it' : 'en')}
            aria-label="Toggle language"
            className="text-xs font-semibold px-2 min-w-[2.5rem]"
          >
            {locale === 'en' ? '🇮🇹' : '🇬🇧'}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.displayName} />
                    <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.username}`}>
                    <User className="mr-2 h-4 w-4" />
                    {t.nav.profile}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wallet">
                    <Wallet className="mr-2 h-4 w-4" />
                    {t.nav.wallet}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut().then(() => { window.location.href = '/'; })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.nav.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{t.nav.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
