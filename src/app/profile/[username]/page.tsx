'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlowBar } from '@/components/posts/GlowBar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAuth } from '@/components/providers/AuthProvider';
import { MapPin, Link as LinkIcon, UserCheck, UserPlus } from 'lucide-react';

interface LivePost {
  id: string;
  content: string;
  expiresAt: string | null;
  bornAt: string;
  likeCount: number;
  commentCount: number;
}

interface StatsData {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
  };
  totalLifetimeSeconds: number;
  recordSeconds: number;
  generosityFuel: number;
  crystals: number;
  posts7d: number;
  posts30d: number;
  livePosts: LivePost[];
  profile?: {
    location?: string | null;
    website?: string | null;
    followerCount?: number;
    followingCount?: number;
  };
  isFollowing?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!username) return;

    Promise.all([
      fetch(`/api/users/${username}/stats`).then((r) => r.json()),
      fetch(`/api/profile/${username}`).then((r) => r.json()),
    ])
      .then(([statsData, profileData]) => {
        setStats({
          ...statsData,
          profile: profileData?.profile,
          isFollowing: profileData?.isFollowing,
        });
        setFollowing(profileData?.isFollowing ?? false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    if (!currentUser || !stats) return;
    const prev = following;
    setFollowing(!following);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: stats.user.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFollowing(data.following);
    } catch {
      setFollowing(prev);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!stats) {
    return (
      <PageWrapper>
        <div className="text-center py-16">
          <p className="text-2xl mb-2">User not found</p>
          <p className="text-muted-foreground">@{username} doesn&apos;t exist</p>
        </div>
      </PageWrapper>
    );
  }

  const { user: profileUser } = stats;
  const isOwnProfile = currentUser?.id === profileUser.id;

  const statCards = [
    { icon: '⏱', label: 'Tempo totale', value: formatDuration(stats.totalLifetimeSeconds) },
    { icon: '🏆', label: 'Record personale', value: formatDuration(stats.recordSeconds) },
    { icon: '💰', label: 'Generosità', value: `${stats.generosityFuel.toFixed(2)} FUEL` },
    { icon: '💎', label: 'Cristalli', value: String(stats.crystals) },
    { icon: '📊', label: 'Ritmo (7gg / 30gg)', value: `${stats.posts7d} / ${stats.posts30d}` },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Profile header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileUser.avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">
                {profileUser.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {!isOwnProfile && currentUser && (
              <Button variant={following ? 'outline' : 'default'} size="sm" onClick={handleFollow}>
                {following ? (
                  <><UserCheck className="h-4 w-4 mr-1" />Following</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-1" />Follow</>
                )}
              </Button>
            )}

            {isOwnProfile && (
              <Button variant="outline" size="sm" asChild>
                <a href="/settings">Edit Profile</a>
              </Button>
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold">{profileUser.displayName}</h1>
            <p className="text-muted-foreground">@{profileUser.username}</p>
          </div>

          {profileUser.bio && <p className="text-sm">{profileUser.bio}</p>}

          <div className="flex gap-4 text-sm flex-wrap">
            {stats.profile?.location && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {stats.profile.location}
              </span>
            )}
            {stats.profile?.website && (
              <a
                href={stats.profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                {stats.profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-semibold">{stats.profile?.followerCount ?? 0}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
            <div>
              <span className="font-semibold">{stats.profile?.followingCount ?? 0}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl bg-surface-card border p-4 flex flex-col gap-1">
              <span className="text-2xl">{icon}</span>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Live posts section */}
        {stats.livePosts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">🔥 Live ora</h2>
            {stats.livePosts.map((post) => (
              <div key={post.id} className="rounded-xl border bg-surface-card p-4 space-y-2">
                <p className="text-sm line-clamp-2">{post.content}</p>
                <div className="flex gap-3 text-xs text-muted-foreground mb-1">
                  <span>❤ {post.likeCount}</span>
                  <span>💬 {post.commentCount}</span>
                </div>
                {post.expiresAt && (
                  <GlowBar expiresAt={post.expiresAt} bornAt={post.bornAt} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
