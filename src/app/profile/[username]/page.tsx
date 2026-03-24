'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlowBar } from '@/components/posts/GlowBar';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  ProfileThemeProvider,
  useProfileTheme,
  getThemeClasses,
  type ProfileTheme,
} from '@/components/providers/ProfileThemeProvider';
import { MapPin, Link as LinkIcon, UserCheck, UserPlus, Timer, Trophy, Coins, Gem, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const THEME_LABELS: Record<ProfileTheme, string> = {
  minimal:  'Minimal',
  cyberpunk: 'Cyberpunk',
  gold:     'Gold',
};

function ProfileContent({ username }: { username: string }) {
  const { user: currentUser } = useAuth();
  const { theme, setTheme } = useProfileTheme();
  const tc = getThemeClasses(theme);

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
        setStats({ ...statsData, profile: profileData?.profile, isFollowing: profileData?.isFollowing });
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
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <p className="text-2xl mb-2">Utente non trovato</p>
        <p className="text-white/40">@{username} non esiste</p>
      </div>
    );
  }

  const { user: profileUser } = stats;
  const isOwnProfile = currentUser?.id === profileUser.id;

  const statCards = [
    {
      icon: Timer,
      label: 'Tempo totale',
      value: formatDuration(stats.totalLifetimeSeconds),
      hint: 'Somma della vita di tutti i tuoi post',
    },
    {
      icon: Trophy,
      label: 'Record personale',
      value: formatDuration(stats.recordSeconds),
      hint: 'Il post più longevo che hai pubblicato',
    },
    {
      icon: Coins,
      label: 'Generosità',
      value: `${stats.generosityFuel.toFixed(2)} FUEL`,
      hint: 'FUEL donati alla community',
    },
    {
      icon: Gem,
      label: 'Cristalli',
      value: String(stats.crystals),
      hint: 'Post cristallizzati permanentemente',
    },
    {
      icon: BarChart2,
      label: 'Ritmo',
      value: `${stats.posts7d} / ${stats.posts30d}`,
      hint: 'Post negli ultimi 7 e 30 giorni',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          'glass-card rounded-2xl p-5 space-y-4',
          tc.shadow
        )}
      >
        <div className="flex items-start justify-between">
          <Avatar className={cn('h-20 w-20', tc.ring)}>
            <AvatarImage src={profileUser.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-white/10 text-white text-xl">
              {profileUser.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex gap-2">
            {/* Theme picker – only on own profile */}
            {isOwnProfile && (
              <div className="flex gap-1">
                {(Object.keys(THEME_LABELS) as ProfileTheme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      'px-2 py-1 rounded-full text-[10px] border transition-all',
                      theme === t
                        ? cn('border-white/30 text-white/90 bg-white/10')
                        : 'border-white/10 text-white/30 hover:text-white/60'
                    )}
                  >
                    {THEME_LABELS[t]}
                  </button>
                ))}
              </div>
            )}

            {!isOwnProfile && currentUser && (
              <Button
                variant={following ? 'outline' : 'default'}
                size="sm"
                onClick={handleFollow}
                className={cn(following && 'border-white/20 bg-white/5')}
              >
                {following ? (
                  <><UserCheck className="h-4 w-4 mr-1" />Following</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-1" />Follow</>
                )}
              </Button>
            )}

            {isOwnProfile && (
              <Button variant="outline" size="sm" asChild className="border-white/20 bg-white/5">
                <a href="/settings">Modifica Profilo</a>
              </Button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-white">{profileUser.displayName}</h1>
          <p className={cn('text-sm', tc.accent)}>@{profileUser.username}</p>
        </div>

        {profileUser.bio && (
          <p className="text-sm text-white/70 leading-relaxed">{profileUser.bio}</p>
        )}

        <div className="flex gap-4 text-sm flex-wrap">
          {stats.profile?.location && (
            <span className="flex items-center gap-1 text-white/40">
              <MapPin className="h-3.5 w-3.5" />
              {stats.profile.location}
            </span>
          )}
          {stats.profile?.website && (
            <a
              href={stats.profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('flex items-center gap-1 hover:underline', tc.accent)}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {stats.profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        <div className="flex gap-6 text-sm">
          <div>
            <span className="font-semibold text-white">{stats.profile?.followerCount ?? 0}</span>
            <span className="text-white/40 ml-1">Follower</span>
          </div>
          <div>
            <span className="font-semibold text-white">{stats.profile?.followingCount ?? 0}</span>
            <span className="text-white/40 ml-1">Following</span>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map(({ icon: Icon, label, value, hint }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.06 }}
            title={hint}
            className={cn(
              'glass-card rounded-2xl p-4 flex flex-col gap-2 border transition-all cursor-default',
              tc.statBorder,
              tc.statShadow
            )}
          >
            <div className={cn('p-2 rounded-xl w-fit', tc.badge)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-white leading-none">{value}</p>
            <p className="text-[11px] text-white/40">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Live posts */}
      {stats.livePosts.length > 0 && (
        <div className="space-y-3">
          <h2 className={cn('text-sm font-semibold uppercase tracking-widest', tc.accent)}>
            🔥 Live ora
          </h2>
          {stats.livePosts.map((post, idx) => (
            <motion.a
              key={post.id}
              href={`/posts/${post.id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.07 }}
              className={cn(
                'block glass-card rounded-2xl p-4 space-y-2 border transition-all',
                tc.statBorder,
                tc.statShadow
              )}
            >
              <p className="text-sm text-white/80 line-clamp-2">{post.content}</p>
              <div className="flex gap-3 text-xs text-white/40">
                <span>🔥 {post.likeCount}</span>
                <span>💬 {post.commentCount}</span>
              </div>
              {post.expiresAt && (
                <GlowBar expiresAt={post.expiresAt} bornAt={post.bornAt} />
              )}
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;

  return (
    <ProfileThemeProvider>
      <PageWrapper>
        <ProfileContent username={username} />
      </PageWrapper>
    </ProfileThemeProvider>
  );
}
