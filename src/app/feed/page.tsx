'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PostCard } from '@/components/posts/PostCard';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/AuthProvider';
import { RefreshCw, PenSquare } from 'lucide-react';
import Link from 'next/link';
import type { FeedPost, FeedFilter } from '@/types';
import { useDailyBonus } from '@/hooks/useDailyBonus';

export default function FeedPage() {
  const { user } = useAuth();
  useDailyBonus();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async (resetList = true) => {
    if (resetList) setLoading(true);
    else setLoadingMore(true);

    setError(null);
    try {
      const cursor = resetList ? '' : (nextCursor ?? '');
      const params = new URLSearchParams({ filter, limit: '10' });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error('Failed to load feed');

      const data = await res.json();
      setPosts((prev) => resetList ? data.posts : [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, nextCursor]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadPosts(true); }, [filter]);

  const handlePostUpdate = (postId: string, updates: Partial<FeedPost>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates } : p))
    );
  };

  return (
    <PageWrapper>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Feed</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadPosts(true)}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {user && (
              <Button size="sm" asChild>
                <Link href="/posts/new">
                  <PenSquare className="h-4 w-4 mr-1" />
                  Post
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FeedFilter)}>
          <TabsList>
            <TabsTrigger value="all">All Posts</TabsTrigger>
            {user && <TabsTrigger value="following">Following</TabsTrigger>}
          </TabsList>
        </Tabs>

        {/* Posts */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => loadPosts(true)}>Try Again</Button>
          </div>
        ) : posts.length === 0 ? (
          <EmptyFeed filter={filter} />
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  compact
                  onUpdate={(updates) => handlePostUpdate(post.id, updates)}
                />
              ))}
            </div>

            {nextCursor && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => loadPosts(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}

function PostCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

function EmptyFeed({ filter }: { filter: FeedFilter }) {
  return (
    <div className="text-center py-16 space-y-3">
      <p className="text-4xl">⏱</p>
      <h3 className="font-semibold text-lg">
        {filter === 'following' ? 'No posts from people you follow' : 'No live posts right now'}
      </h3>
      <p className="text-muted-foreground text-sm">
        {filter === 'following'
          ? 'Follow some people to see their posts here'
          : 'Be the first to share something today!'}
      </p>
      <Button asChild>
        <Link href="/posts/new">Create a Post</Link>
      </Button>
    </div>
  );
}
