'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp } from 'lucide-react';
import { REMOTE_CONFIG_DEFAULTS } from '@/lib/config';
import type { WalletData } from '@/types';

interface WalletBalanceProps {
  wallet: WalletData;
}

export function WalletBalance({ wallet }: WalletBalanceProps) {
  const dailyCap = REMOTE_CONFIG_DEFAULTS.FAUCET_DAILY_CAP;
  const earnProgress = Math.min((wallet.earnedToday / dailyCap) * 100, 100);

  return (
    <Card className="bg-gradient-to-br from-timt-light to-orange-50 dark:from-timt/10 dark:to-orange-900/10 border-timt/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-timt-dark dark:text-timt">
          <Coins className="h-5 w-5" />
          TIMT Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-4xl font-bold text-timt-dark dark:text-timt">
            {wallet.balance.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">TIMT tokens</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Earned today</span>
            </div>
            <span className="font-medium">
              {wallet.earnedToday.toFixed(2)} / {dailyCap} TIMT
            </span>
          </div>
          <Progress value={earnProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {Math.max(0, dailyCap - wallet.earnedToday).toFixed(2)} TIMT remaining today
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
