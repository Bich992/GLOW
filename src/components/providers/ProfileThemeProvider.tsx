'use client';

import React, { createContext, useContext, useState } from 'react';

export type ProfileTheme = 'minimal' | 'cyberpunk' | 'gold';

interface ProfileThemeCtx {
  theme: ProfileTheme;
  setTheme: (t: ProfileTheme) => void;
}

const Ctx = createContext<ProfileThemeCtx>({ theme: 'minimal', setTheme: () => {} });

export function ProfileThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ProfileTheme>('minimal');
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useProfileTheme = () => useContext(Ctx);

/** Returns Tailwind class strings for the active theme */
export function getThemeClasses(theme: ProfileTheme) {
  switch (theme) {
    case 'cyberpunk':
      return {
        ring:       'ring-1 ring-cyan-400/60',
        shadow:     'shadow-[0_0_24px_rgba(34,211,238,0.15)]',
        border:     'border-cyan-400/20',
        accent:     'text-cyan-300',
        statBorder: 'border-cyan-400/20 hover:border-cyan-400/50',
        statShadow: 'hover:shadow-[0_0_16px_rgba(34,211,238,0.12)]',
        badge:      'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
      };
    case 'gold':
      return {
        ring:       'ring-1 ring-yellow-400/50',
        shadow:     'shadow-[0_0_24px_rgba(251,191,36,0.12)]',
        border:     'border-yellow-400/20',
        accent:     'text-yellow-300',
        statBorder: 'border-yellow-400/20 hover:border-yellow-400/50',
        statShadow: 'hover:shadow-[0_0_16px_rgba(251,191,36,0.12)]',
        badge:      'bg-yellow-400/10 text-yellow-300 border-yellow-400/20',
      };
    default: // minimal
      return {
        ring:       'ring-1 ring-white/10',
        shadow:     '',
        border:     'border-white/10',
        accent:     'text-white/70',
        statBorder: 'border-white/10 hover:border-white/20',
        statShadow: '',
        badge:      'bg-white/10 text-white/60 border-white/10',
      };
  }
}
