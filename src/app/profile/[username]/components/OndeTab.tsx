'use client';

import { useEffect, useState } from 'react';
import { GlowBar } from '@/components/posts/GlowBar';
import { CountdownTimer } from '@/components/posts/CountdownTimer';

interface LivePost {
  id: string;
  content: string;
  expiresAt: string | null;
  bornAt: string;
  likeCount: number;
  commentCount: number;
}

interface OndeTabProps {
  username: string;
  userId: string;
  initialPosts: LivePost[];
}

export function OndeTab({ username: _username, userId, initialPosts }: OndeTabProps) {
  const [posts, setPosts] = useState<LivePost[]>(initialPosts);

  // Supabase Realtime subscription — remove cards when post expires
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    async function subscribe() {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) return;

        const supabase = createClient(supabaseUrl, supabaseKey);

        channel = supabase
          .channel(`profile-posts:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'Post',
              filter: `authorId=eq.${userId}`,
            },
            (payload: { new: Record<string, unknown> }) => {
              const updated = payload.new;
              if (updated['is_expired'] === true || updated['is_crystallised'] === true) {
                setPosts((prev) => prev.filter((p) => p.id !== updated['id']));
              }
            }
          )
          .subscribe();
      } catch {
        // Realtime not available — graceful degradation
      }
    }

    void subscribe();

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      channel?.unsubscribe();
    };
  }, [userId]);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <span className="text-3xl">🌊</span>
        <p className="text-sm">
          Nessun post attivo. Pubblica durante un&apos;Onda per massimizzare la vita 🌊
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="glass-card rounded-xl p-4 space-y-3">
          <p className="text-sm leading-relaxed">{post.content}</p>

          {post.expiresAt && (
            <GlowBar
              expiresAt={post.expiresAt}
              bornAt={post.bornAt}
              onExpire={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
            />
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex gap-3">
              <span>❤️ {post.likeCount}</span>
              <span>💬 {post.commentCount}</span>
            </div>
            {post.expiresAt && (
              <CountdownTimer expiresAt={post.expiresAt} showIcon={false} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
