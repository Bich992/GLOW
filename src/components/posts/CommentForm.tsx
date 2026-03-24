'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { Send, RefreshCw } from 'lucide-react';
import type { CommentWithAuthor } from '@/types';

const commentSchema = z.object({
  content: z.string().min(10, 'Comment must be at least 10 characters').max(500),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentFormProps {
  postId: string;
  onCommentAdded?: (comment: CommentWithAuthor) => void;
}

export function CommentForm({ postId, onCommentAdded }: CommentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' },
  });

  const content = form.watch('content');

  const handleSubmit = async (data: CommentFormData) => {
    if (!user) {
      toast({ title: 'Sign in to comment', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: data.content }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to post comment');
      }

      const result = await res.json();

      // Create local comment for immediate display
      const newComment: CommentWithAuthor = {
        id: result.id,
        content: data.content,
        createdAt: new Date().toISOString(),
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      };

      onCommentAdded?.(newComment);
      form.reset();

      toast({
        title: 'Comment posted',
        description: '+0.20 TIMT earned by post author',
      });
    } catch (e) {
      toast({
        title: 'Failed to comment',
        description: e instanceof Error ? e.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        <a href="/login" className="text-primary hover:underline">Sign in</a> to comment
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
      <Textarea
        {...form.register('content')}
        placeholder="Write a thoughtful comment (min 10 chars)..."
        className="resize-none min-h-[80px]"
        disabled={loading}
      />
      <div className="flex items-center justify-between">
        {form.formState.errors.content ? (
          <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{content.length}/500</p>
        )}
        <Button type="submit" size="sm" disabled={loading || content.length < 10}>
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" />
              Comment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
