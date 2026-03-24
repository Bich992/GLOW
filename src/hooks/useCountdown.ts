'use client';

import { useState, useEffect } from 'react';

export function useCountdown(expiresAt: string | Date) {
  const getTimeLeft = () => {
    const expires = new Date(expiresAt).getTime();
    return Math.max(0, expires - Date.now());
  };

  const [timeLeftMs, setTimeLeftMs] = useState(getTimeLeft);

  useEffect(() => {
    setTimeLeftMs(getTimeLeft());
    const interval = setInterval(() => {
      const left = getTimeLeft();
      setTimeLeftMs(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return timeLeftMs;
}

export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
