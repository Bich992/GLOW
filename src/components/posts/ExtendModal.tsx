'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
// Inline computation (same logic as server, duplicated for client preview)
function computeDeltaSeconds(s: number): number {
  const base = 3600;
  const decay = 0.8;
  const minSec = 300;
  const delta = Math.round(base * Math.pow(decay, s));
  return Math.max(delta, minSec);
}
import { Clock, RefreshCw } from 'lucide-react';

interface ExtendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  userExtensionCount: number;
  onSuccess?: (newExpiresAt: Date) => void;
}

export function ExtendModal({
  open,
  onOpenChange,
  postId,
  userExtensionCount,
  onSuccess,
}: ExtendModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Calculate delta on client for preview (server will recalculate)
  const deltaSeconds = computeDeltaSeconds(userExtensionCount);
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  const deltaHours = Math.floor(deltaMinutes / 60);
  const remainingMinutes = deltaMinutes % 60;

  const deltaDisplay = deltaHours > 0
    ? `${deltaHours}h ${remainingMinutes}m`
    : `${deltaMinutes}m`;

  const handleExtend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/extend`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to extend post');
      }

      const data = await res.json();
      toast({
        title: 'Post extended!',
        description: `Added ${deltaDisplay} to your post's lifetime.`,
        variant: 'default',
      });
      onSuccess?.(new Date(data.newExpiresAt));
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Extension failed',
        description: e instanceof Error ? e.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-timt" />
            Extend Post Lifetime
          </DialogTitle>
          <DialogDescription>
            Give your post more time to be seen. Extensions are free but limited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/50">
            <div>
              <p className="text-sm font-medium">Time to be added</p>
              <p className="text-xs text-muted-foreground">
                Extension #{userExtensionCount + 1} (decay factor applied)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-timt">+{deltaDisplay}</p>
              <p className="text-xs text-muted-foreground">{deltaSeconds} seconds</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Max 5 extensions per user per post per day</p>
            <p>• Each extension adds slightly less time than the last</p>
            <p>• Extensions are free — no TIMT required</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleExtend} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Extend +{deltaDisplay}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
