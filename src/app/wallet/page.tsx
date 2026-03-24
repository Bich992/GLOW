'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { TransactionLog } from '@/components/wallet/TransactionLog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { WalletData, TransactionData } from '@/types';

export default function WalletPage() {
  useAuth();
  const { t } = useLanguage();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(() => {
    setLoading(true);
    fetch('/api/wallet')
      .then((res) => res.json())
      .then((data) => {
        setWallet(data.wallet);
        setTransactions(data.transactions);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (loading) {
    return (
      <PageWrapper>
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t.wallet.title}</h1>

        {wallet ? (
          <WalletBalance wallet={wallet} />
        ) : (
          <p className="text-muted-foreground">{t.wallet.noWallet}</p>
        )}

        {/* Earn Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.wallet.howToEarn}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <div className="flex justify-between">
              <span>{t.wallet.receiveLike}</span>
              <span className="font-medium text-green-600">+0.05 TIMT</span>
            </div>
            <div className="flex justify-between">
              <span>{t.wallet.receiveComment}</span>
              <span className="font-medium text-green-600">+0.20 TIMT</span>
            </div>
            <div className="flex justify-between">
              <span>{t.wallet.highEngagement}</span>
              <span className="font-medium text-green-600">+0.50 TIMT</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>{t.wallet.dailyEarnCap}</span>
              <span className="font-medium">3.00 TIMT/day</span>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <div>
          <h2 className="text-lg font-semibold mb-3">{t.wallet.transactionHistory}</h2>
          <TransactionLog transactions={transactions} />
        </div>
      </div>
    </PageWrapper>
  );
}
