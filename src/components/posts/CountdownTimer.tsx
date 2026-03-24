'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string | Date;
  className?: string;
  onExpire?: () => void;
  showIcon?: boolean;
}

function getTimeLeft(expiresAt: Date): {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
} {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds, isExpired: false };
}

export function CountdownTimer({ expiresAt, className, onExpire, showIcon = true }: CountdownTimerProps) {
  // useMemo prevents a new Date object on every render (fixes exhaustive-deps warning)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const expiry = React.useMemo(() => new Date(expiresAt), [expiresAt]);
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiry));

  useEffect(() => {
    const tick = () => {
      const newTimeLeft = getTimeLeft(expiry);
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.isExpired && onExpire) {
        onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiry, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <span className={cn('text-muted-foreground text-xs', className)}>
        {showIcon && <Clock className="inline h-3 w-3 mr-1" />}
        Expired
      </span>
    );
  }

  const isWarning = timeLeft.totalSeconds < 30 * 60; // less than 30 min
  const isCritical = timeLeft.totalSeconds < 5 * 60; // less than 5 min

  const display = timeLeft.hours > 0
    ? `${timeLeft.hours}h ${timeLeft.minutes}m`
    : timeLeft.minutes > 0
      ? `${timeLeft.minutes}m ${timeLeft.seconds}s`
      : `${timeLeft.seconds}s`;

  return (
    <span
      className={cn(
        'text-xs font-mono font-medium',
        isCritical && 'animate-countdown-warning text-destructive',
        isWarning && !isCritical && 'text-orange-500',
        !isWarning && 'text-muted-foreground',
        className
      )}
    >
      {showIcon && <Clock className="inline h-3 w-3 mr-1" />}
      {display}
    </span>
  );
}
