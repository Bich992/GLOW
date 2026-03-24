'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';

export function useDailyBonus() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (!user || fired.current) return;
    fired.current = true;

    fetch('/api/auth/daily-bonus', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data.awarded) {
          const msg =
            data.streakBonus > 0
              ? `🔥 +${data.amount.toFixed(2)} FUEL — Login giornaliero! (Streak ${data.streak} 🔥 +${data.streakBonus.toFixed(2)} bonus)`
              : `🔥 +${data.amount.toFixed(2)} FUEL — Login giornaliero!`;
          toast({ title: msg });
          refreshUser().catch(() => {});
        }
      })
      .catch(() => {});
  }, [user, toast, refreshUser]);
}
