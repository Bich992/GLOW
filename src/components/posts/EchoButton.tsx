'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw } from 'lucide-react';

interface EchoButtonProps {
  postId: string;
  onEchoed?: (newExpiresAt: string) => void;
}

export function EchoButton({ postId, onEchoed }: EchoButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to echo');
      }
      const data = await res.json();
      toast({ title: '🔁 Echoed!', description: '+30 minutes added to post lifetime.' });
      setOpen(false);
      setComment('');
      onEchoed?.(data.expiresAt);
    } catch (e) {
      toast({
        title: 'Echo failed',
        description: e instanceof Error ? e.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1 text-muted-foreground">
        <RefreshCw className="h-4 w-4" />
        Echo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔁 Echo this post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Add your commentary to reshare. Your echo adds +30 minutes to the post&apos;s lifetime.
          </p>
          <Textarea
            placeholder="Add your commentary…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px]"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !comment.trim()}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Echo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
