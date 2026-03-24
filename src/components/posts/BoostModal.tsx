'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { TimtChip } from './TimtChip';
import { Zap, RefreshCw } from 'lucide-react';

const boostSchema = z.object({
  amount: z.number().min(0.5, 'Minimum 0.5 TIMT').max(20, 'Maximum 20 TIMT'),
});

type BoostFormData = z.infer<typeof boostSchema>;

interface BoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  walletBalance: number;
  onSuccess?: (newPriority: number, spentAmount: number) => void;
}

export function BoostModal({ open, onOpenChange, postId, walletBalance, onSuccess }: BoostModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<BoostFormData>({
    resolver: zodResolver(boostSchema),
    defaultValues: { amount: 1 },
  });

  const amount = form.watch('amount');
  const priorityBoost = (amount * 0.2 * 100).toFixed(0);

  const handleBoost = async (data: BoostFormData) => {
    if (data.amount > walletBalance) {
      toast({ title: t.boost.insufficientBalance, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: data.amount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t.boost.failed);
      }

      const result = await res.json();
      toast({
        title: t.boost.success,
        description: t.boost.successDesc.replace('{{pct}}', priorityBoost),
        variant: 'default',
      });
      onSuccess?.(result.newPriority, data.amount);
      onOpenChange(false);
      form.reset();
    } catch (e) {
      toast({
        title: t.boost.failed,
        description: e instanceof Error ? e.message : t.general.error,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const presetAmounts = [0.5, 1, 2, 5];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {t.boost.title}
          </DialogTitle>
          <DialogDescription>
            {t.boost.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleBoost)} className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.boost.yourBalance}</span>
            <TimtChip balance={walletBalance} />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={amount === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => form.setValue('amount', preset)}
              >
                {preset}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{t.boost.customAmount}</Label>
            <Input
              id="amount"
              type="number"
              step="0.5"
              min="0.5"
              max="20"
              {...form.register('amount', { valueAsNumber: true })}
              className="text-center text-lg font-bold"
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="rounded-lg border p-3 bg-muted/50 space-y-1">
            <div className="flex justify-between text-sm">
              <span>{t.boost.cost}</span>
              <TimtChip amount={amount} variant="spend" />
            </div>
            <div className="flex justify-between text-sm">
              <span>{t.boost.priorityBoost}</span>
              <span className="font-medium text-yellow-600">+{priorityBoost}% {t.boost.forMinutes}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t.boost.note}</p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t.boost.cancel}
            </Button>
            <Button type="submit" variant="timt" disabled={loading || !amount || amount > walletBalance}>
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {t.boost.boostFor} {amount?.toFixed(2)} TIMT
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
