'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PostCard } from '@/components/posts/PostCard';
import { CommentList } from '@/components/posts/CommentList';
import { CommentForm } from '@/components/posts/CommentForm';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { FeedPost, CommentWithAuthor } from '@/types';

interface PostDetail extends FeedPost {
  comments: CommentWithAuthor[];
}

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);

  useEffect(() => {
    if (!postId) return;

    fetch(`/api/posts/${postId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Post not found');
        return res.json();
      })
      .then((data) => {
        setPost(data);
        setComments(data.comments ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) {
    return (
      <PageWrapper>
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </PageWrapper>
    );
  }

  if (error || !post) {
    return (
      <PageWrapper>
        <div className="text-center py-16">
          <p className="text-destructive mb-4">{error ?? 'Post not found'}</p>
          <Button asChild>
            <Link href="/feed">Back to Feed</Link>
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/feed" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Link>
        </Button>

        {/* Post */}
        <PostCard
          post={post}
          showActions={post.status === 'live'}
          onUpdate={(updates) => setPost((prev) => prev ? { ...prev, ...updates } : null)}
        />

        {/* Comments Section */}
        {post.status === 'live' && (
          <>
            <Separator />
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">
                Comments ({comments.length})
              </h2>
              <CommentForm
                postId={post.id}
                onCommentAdded={(comment) => setComments((prev) => [comment, ...prev])}
              />
              <CommentList
                comments={comments}
                postId={post.id}
                onReply={async (parentId, content) => {
                  const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: post.id, content, parentId }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setComments(prev => [...prev, data]);
                  }
                }}
              />
            </div>
          </>
        )}

        {post.status === 'expired' && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg">This post has expired.</p>
            <p className="text-sm mt-2">Comments are closed for expired posts.</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
