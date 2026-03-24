'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import Link from 'next/link';
import { MessageCircle, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import type { CommentWithAuthor } from '@/types';

interface CommentListProps {
  comments: CommentWithAuthor[];
  postId: string;
  onReply?: (parentId: string, content: string) => Promise<void>;
}

function TipButton({ commentId, authorName }: { commentId: string; authorName: string }) {
  const { user, updateWalletBalance } = useAuth();
  const { toast } = useToast();
  const [tipping, setTipping] = useState(false);
  const [tipped, setTipped] = useState(false);

  const handleTip = async () => {
    if (!user) { toast({ title: 'Accedi per premiare', variant: 'destructive' }); return; }
    if (tipped) return;
    setTipping(true);
    try {
      const res = await fetch(`/api/comments/${commentId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0.5 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Errore');
      }
      updateWalletBalance(-0.5);
      setTipped(true);
      toast({ title: `+0.5 TIMT a ${authorName}!`, description: 'Commento premiato' });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Errore', variant: 'destructive' });
    } finally {
      setTipping(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleTip} disabled={tipping || tipped}
      className={`h-7 px-2 text-xs gap-1 ${tipped ? 'text-yellow-500' : 'text-muted-foreground'}`}>
      <Coins className="h-3.5 w-3.5" />
      {tipped ? 'Premiato' : '0.5 TIMT'}
    </Button>
  );
}

function ReplyForm({ onSubmit, onCancel }: { onSubmit: (c: string) => Promise<void>; onCancel: () => void }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (content.length < 2) return;
    setLoading(true);
    await onSubmit(content);
    setContent('');
    setLoading(false);
    onCancel();
  };

  return (
    <div className="mt-2 ml-11 flex gap-2">
      <input
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Rispondi..."
        className="flex-1 text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
      />
      <Button size="sm" onClick={submit} disabled={loading || content.length < 2} className="h-8">Invia</Button>
      <Button size="sm" variant="ghost" onClick={onCancel} className="h-8">Annulla</Button>
    </div>
  );
}

export function CommentList({ comments, postId, onReply }: CommentListProps) {
  const { user } = useAuth();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});

  type CommentWithParent = CommentWithAuthor & { parentId?: string };
  const topLevel = (comments as CommentWithParent[]).filter(c => !c.parentId);
  const getReplies = (parentId: string) =>
    (comments as CommentWithParent[]).filter(c => c.parentId === parentId);

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Nessun commento ancora. Sii il primo!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {topLevel.map((comment, i) => {
        const commentReplies = getReplies(comment.id);
        const hasReplies = commentReplies.length > 0;
        const showR = showReplies[comment.id];

        return (
          <div key={comment.id}>
            <div className="flex gap-3">
              <Link href={`/profile/${comment.user.username}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.user.avatarUrl ?? undefined} />
                  <AvatarFallback>{comment.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/profile/${comment.user.username}`} className="text-sm font-medium hover:underline">
                    {comment.user.displayName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{comment.content}</p>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-1">
                  {user && user.id !== comment.user.id && (
                    <>
                      <Button variant="ghost" size="sm"
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                        Rispondi
                      </Button>
                      <TipButton commentId={comment.id} authorName={comment.user.displayName} />
                    </>
                  )}
                  {hasReplies && (
                    <Button variant="ghost" size="sm"
                      onClick={() => setShowReplies(p => ({ ...p, [comment.id]: !p[comment.id] }))}
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground">
                      {showR ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {commentReplies.length} {commentReplies.length === 1 ? 'risposta' : 'risposte'}
                    </Button>
                  )}
                </div>

                {replyingTo === comment.id && onReply && (
                  <ReplyForm
                    onSubmit={(content) => onReply(comment.id, content)}
                    onCancel={() => setReplyingTo(null)}
                  />
                )}

                {showR && commentReplies.length > 0 && (
                  <div className="mt-3 ml-4 space-y-3 border-l-2 pl-3">
                    {commentReplies.map(reply => (
                      <div key={reply.id} className="flex gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={reply.user.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{reply.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${reply.user.username}`} className="text-xs font-medium hover:underline">
                              {reply.user.displayName}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {i < topLevel.length - 1 && <Separator className="mt-4" />}
          </div>
        );
      })}
    </div>
  );
}
