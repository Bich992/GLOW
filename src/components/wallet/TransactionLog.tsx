'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Gift, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransactionData } from '@/types';

const TYPE_CONFIG = {
  earn: { icon: ArrowUpRight, label: 'Earned', className: 'text-green-600 dark:text-green-400' },
  spend: { icon: ArrowDownLeft, label: 'Spent', className: 'text-red-600 dark:text-red-400' },
  faucet: { icon: Gift, label: 'Bonus', className: 'text-blue-600 dark:text-blue-400' },
  admin: { icon: ShieldCheck, label: 'Admin', className: 'text-purple-600 dark:text-purple-400' },
};

interface TransactionLogProps {
  transactions: TransactionData[];
}

export function TransactionLog({ transactions }: TransactionLogProps) {
  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No transactions yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((tx) => {
        const config = TYPE_CONFIG[tx.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.earn;
        const Icon = config.icon;
        const isPositive = tx.amount > 0;

        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={cn('p-2 rounded-full bg-muted', config.className)}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {isPositive ? '+' : ''}{tx.amount.toFixed(2)} TIMT
              </p>
              <p className="text-xs text-muted-foreground">
                Balance: {tx.balanceAfter.toFixed(2)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
