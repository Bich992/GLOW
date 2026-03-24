'use client';

import { motion } from 'framer-motion';
import type { TempState } from '@/lib/temperature';

interface TempBadgeProps {
  tempState: TempState;
  temperature?: number;
  className?: string;
}

const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function TempBadge({ tempState, className = '' }: TempBadgeProps) {
  if (tempState === 'COLD') return null;

  const isOnFire = tempState === 'ON_FIRE';

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {/* Animated border ring — GLOWING and ON_FIRE */}
      <span
        className={[
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
          isOnFire
            ? 'border-orange-500 text-orange-400 bg-orange-950/40 temp-glowing'
            : 'border-cyan-500 text-cyan-400 bg-cyan-950/40 temp-glowing',
        ].join(' ')}
      >
        {isOnFire ? '🔥 On Fire' : '✨ Glowing'}
      </span>

      {/* ON_FIRE particle burst */}
      {isOnFire && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {PARTICLE_ANGLES.map((angle) => (
            <motion.span
              key={angle}
              className="absolute h-1 w-1 rounded-full bg-orange-400"
              initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
              animate={{
                scale: [0, 2, 0],
                opacity: [1, 0.6, 0],
                x: Math.cos((angle * Math.PI) / 180) * 14,
                y: Math.sin((angle * Math.PI) / 180) * 14,
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 1.4,
                ease: 'easeOut',
              }}
            />
          ))}
        </span>
      )}
    </div>
  );
}
