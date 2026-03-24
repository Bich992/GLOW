'use client';

import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useCountdown, formatTimeLeft } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';

interface GlowBarProps {
  expiresAt: string;
  bornAt: string;
  className?: string;
  onExpire?: () => void;
  /** Increment this to trigger a surge animation (e.g. after adding FUEL/boost) */
  fuelTrigger?: number;
}

/** Returns bar color, glow shadow, and text colour based on % life remaining */
function getGlowStyle(pct: number) {
  if (pct > 60) {
    return {
      bar:    '#E0F7FA',
      shadow: '0 0 10px rgba(224,247,250,0.6), 0 0 3px rgba(224,247,250,0.9)',
      text:   'text-cyan-100 bloom-cyan',
    };
  }
  if (pct > 10) {
    return {
      bar:    '#FFB300',
      shadow: '0 0 10px rgba(255,179,0,0.55), 0 0 3px rgba(255,179,0,0.8)',
      text:   'text-amber-400 bloom-amber',
    };
  }
  return {
    bar:    '#FF3D00',
    shadow: '0 0 14px rgba(255,61,0,0.7), 0 0 5px rgba(255,61,0,0.95)',
    text:   'text-red-500 bloom-red',
  };
}

export function GlowBar({ expiresAt, bornAt, className, onExpire, fuelTrigger }: GlowBarProps) {
  const timeLeftMs  = useCountdown(expiresAt);
  const surgeCtrl   = useAnimation();

  const maxTimeMs = new Date(expiresAt).getTime() - new Date(bornAt).getTime();
  const pct = maxTimeMs > 0 ? Math.max(0, Math.min(100, (timeLeftMs / maxTimeMs) * 100)) : 0;
  const critical = pct <= 10;

  const style = getGlowStyle(pct);

  React.useEffect(() => {
    if (timeLeftMs <= 0) onExpire?.();
  }, [timeLeftMs, onExpire]);

  /* Surge animation when FUEL is added */
  React.useEffect(() => {
    if (!fuelTrigger) return;
    surgeCtrl.start({
      scaleX: [1, 1.05, 0.98, 1],
      transition: { duration: 0.4, ease: 'easeOut' },
    });
  }, [fuelTrigger, surgeCtrl]);

  return (
    <div className={cn('select-none', className)}>
      {/* Track */}
      <div className="h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
        <motion.div
          animate={surgeCtrl}
          className={cn('h-full rounded-full origin-left', critical && 'animate-flicker')}
          style={{
            width: `${pct}%`,
            backgroundColor: style.bar,
            boxShadow: style.shadow,
            transition: 'width 1s linear, background-color 0.6s ease, box-shadow 0.6s ease',
          }}
        />
      </div>

      {/* Time label */}
      <p className={cn('mt-1 text-[11px] tabular-nums font-mono', style.text)}>
        {timeLeftMs > 0 ? formatTimeLeft(timeLeftMs) : 'Spento'}
      </p>
    </div>
  );
}
