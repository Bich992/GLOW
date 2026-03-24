'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Coins } from 'lucide-react';
import { CURRENCY_NAME } from '@/lib/constants';

interface TimtChipProps {
  balance?: number;
  amount?: number;
  variant?: 'balance' | 'earn' | 'spend' | 'boost';
  className?: string;
  showIcon?: boolean;
}

export function TimtChip({ balance, amount, variant = 'balance', className, showIcon = true }: TimtChipProps) {
  const displayValue = balance !== undefined ? balance : amount ?? 0;

  const variantStyles = {
    balance: 'bg-timt-light text-timt-dark dark:bg-timt/20 dark:text-timt',
    earn: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    spend: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    boost: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }[variant];

  const prefix = variant === 'earn' ? '+' : variant === 'spend' ? '-' : '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        variantStyles,
        className
      )}
    >
      {showIcon && <Coins className="h-3 w-3" />}
      {prefix}{displayValue.toFixed(2)} {CURRENCY_NAME}
    </span>
  );
}
