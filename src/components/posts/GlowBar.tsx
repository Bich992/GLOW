'use client';

import React from 'react';
import { useCountdown, formatTimeLeft } from '@/hooks/useCountdown';

interface GlowBarProps {
  expiresAt: string;
  bornAt: string;
  className?: string;
}

export function GlowBar({ expiresAt, bornAt, className }: GlowBarProps) {
  const timeLeftMs = useCountdown(expiresAt);
  const maxTimeMs = new Date(expiresAt).getTime() - new Date(bornAt).getTime();
  const pct = maxTimeMs > 0 ? Math.max(0, Math.min(100, (timeLeftMs / maxTimeMs) * 100)) : 0;

  const FIVE_MIN = 5 * 60 * 1000;
  const THIRTY_MIN = 30 * 60 * 1000;

  const critical = timeLeftMs < FIVE_MIN;
  const warning = !critical && timeLeftMs < THIRTY_MIN;

  const barColor = critical
    ? 'bg-red-600'
    : warning
      ? 'bg-orange-400'
      : 'bg-cyan-400';

  const glowStyle: React.CSSProperties = critical
    ? {}
    : warning
      ? { boxShadow: '0 0 8px theme(colors.orange.400)' }
      : { boxShadow: '0 0 8px rgb(34 211 238)' }; // cyan-400

  return (
    <div className={className}>
      <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={[
            'h-full rounded-full transition-[width] duration-1000 ease-linear glow-bar-breathe',
            barColor,
            critical ? 'animate-pulse' : '',
          ].join(' ')}
          style={{ width: `${pct}%`, ...glowStyle }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
        {formatTimeLeft(timeLeftMs)}
      </p>
    </div>
  );
}
