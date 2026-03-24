'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Flame, MessageCircle, Zap, MoreHorizontal, Flag, Clock, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GlowBar } from './GlowBar';
import { ExtendModal } from './ExtendModal';
import { BoostModal } from './BoostModal';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/types';

interface PostCardProps {
  post: FeedPost;
  showActions?: boolean;
  compact?: boolean;
  onUpdate?: (updatedPost: Partial<FeedPost>) => void;
}

const PARTICLE_COUNT = 8;
// Match the glow palette: cyan-white (fresh), amber, red-brace
const PARTICLE_COLORS = ['#E0F7FA', '#FFB300', '#FF3D00', '#FFB300', '#E0F7FA', '#FF3D00', '#FFB300', '#E0F7FA'];

function ParticleBurst({ trigger }: { trigger: number }) {
  return (
    <AnimatePresence>
      {trigger > 0 &&
        Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
          const angle = (i / PARTICLE_COUNT) * 360;
          const distance = 24 + Math.random() * 12;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * distance;
          const y = Math.sin(rad) * distance;
          const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
          return (
            <motion.span
              key={`${trigger}-${i}`}
              className="absolute pointer-events-none rounded-full"
              style={{
                width: 5,
                height: 5,
                backgroundColor: color,
                top: '50%',
                left: '50%',
                marginTop: -2.5,
                marginLeft: -2.5,
              }}
              initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
              animate={{ opacity: 0, scale: 1.5, x, y }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          );
        })}
    </AnimatePresence>
  );
}

export function PostCard({ post, showActions = true, compact = false, onUpdate }: PostCardProps) {
  const { user, updateWalletBalance } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [liked, setLiked] = useState(post._likedByCurrentUser ?? false);
  const [likeCount, setLikeCount] = useState(post.stats?.likeCount ?? 0);
  const [expiresAt, setExpiresAt] = useState(post.expiresAt ? new Date(post.expiresAt) : null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [isExpired, setIsExpired] = useState(post.status === 'expired');
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [fuelTrigger, setFuelTrigger] = useState(0);

  const isAuthor = user?.id === post.author.id;
  const boostActive = (post.boostPriority ?? 1) > 1.1;

  const handleLike = async () => {
    if (!user) {
      toast({ title: t.posts.signInToLike, variant: 'destructive' });
      return;
    }

    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    if (!liked) {
      setParticleTrigger((n) => n + 1);
      setFuelTrigger((n) => n + 1);
    }

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });

      if (!res.ok) throw new Error('Like failed');

      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast({ title: t.posts.failedToLike, variant: 'destructive' });
    }
  };

  const handleReport = async () => {
    if (!user) return;
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, reason: 'spam' }),
      });
      toast({ title: t.posts.reportSubmitted, description: t.posts.reportSubmittedDesc });
    } catch {
      toast({ title: t.posts.failedToReport, variant: 'destructive' });
    }
  };

  const bornAt = post.born_at ?? post.createdAt ?? new Date().toISOString();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-white/[0.04] backdrop-blur-md',
          'border border-white/10',
          'transition-colors hover:border-white/20',
          boostActive && 'border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.08)]',
          isExpired && 'opacity-50'
        )}
      >
        {/* Boosted glow accent */}
        {boostActive && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
        )}

        <div className={cn('pt-4', compact ? 'px-4 pb-2' : 'px-5 pb-3')}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${post.author.username}`}>
                <Avatar className="h-9 w-9 ring-1 ring-white/10">
                  <AvatarImage src={post.author.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    {post.author.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link
                  href={`/profile/${post.author.username}`}
                  className="font-medium text-sm text-white/90 hover:text-white transition-colors"
                >
                  {post.author.displayName}
                </Link>
                <p className="text-xs text-white/40">
                  @{post.author.username} ·{' '}
                  {post.publishedAt
                    ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
                    : 'Just now'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Wave badge – shown when post was born during a wave */}
              {(post as { waveId?: string | null }).waveId && (
                <Badge className="text-[10px] bg-cyan-400/10 text-cyan-300 border-cyan-400/20 px-1.5 py-0">
                  <Waves className="h-2.5 w-2.5 mr-0.5" />
                  Onda
                </Badge>
              )}
              {boostActive && (
                <Badge className="text-[10px] bg-yellow-400/15 text-yellow-300 border-yellow-400/20 px-1.5 py-0">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  {t.posts.boosted}
                </Badge>
              )}
              {isExpired && (
                <Badge className="text-[10px] bg-white/10 text-white/50 border-white/10">
                  {t.posts.expired}
                </Badge>
              )}

              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/40 hover:text-white/80 hover:bg-white/10"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-[#111] border-white/10 text-white/80"
                  >
                    {!isAuthor && (
                      <DropdownMenuItem
                        onClick={handleReport}
                        className="text-red-400 focus:text-red-300 focus:bg-white/10"
                      >
                        <Flag className="mr-2 h-4 w-4" />
                        {t.posts.report}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Content */}
          <Link href={`/posts/${post.id}`} className="block">
            <p
              className={cn(
                'text-sm leading-relaxed text-white/80',
                compact ? 'line-clamp-3' : 'whitespace-pre-wrap'
              )}
            >
              {post.content}
            </p>

            {post.imageUrl && (
              <div className="mt-3 rounded-xl overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt="Post image"
                  width={600}
                  height={400}
                  className="w-full object-cover max-h-80"
                  style={{ filter: 'saturate(1.1) brightness(0.95)' }}
                />
              </div>
            )}

            {/* Audio player */}
            {(post as { audioUrl?: string | null }).audioUrl && (
              <div className="mt-3">
                <audio
                  controls
                  src={(post as { audioUrl?: string | null }).audioUrl ?? undefined}
                  className="w-full h-10 rounded-lg opacity-80"
                />
              </div>
            )}

            {/* Video player */}
            {(post as { videoUrl?: string | null }).videoUrl && (
              <div className="mt-3 rounded-xl overflow-hidden">
                <video
                  controls
                  src={(post as { videoUrl?: string | null }).videoUrl ?? undefined}
                  className="w-full max-h-72 rounded-xl"
                  style={{ filter: 'saturate(1.1) brightness(0.95)' }}
                />
              </div>
            )}
          </Link>

          {/* GlowBar */}
          {!isExpired && expiresAt && (
            <GlowBar
              expiresAt={expiresAt.toISOString()}
              bornAt={bornAt}
              className="mt-3"
              onExpire={() => setIsExpired(true)}
              fuelTrigger={fuelTrigger}
            />
          )}
        </div>

        {/* Actions */}
        {showActions && !isExpired && (
          <div
            className={cn(
              'flex items-center gap-1 border-t border-white/[0.06]',
              compact ? 'px-4 py-2' : 'px-5 py-3'
            )}
          >
            {/* Like with particle burst */}
            <div className="relative">
              <ParticleBurst trigger={particleTrigger} />
              <motion.button
                onClick={handleLike}
                whileTap={{ scale: 0.85 }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors',
                  liked
                    ? 'text-red-400 bg-red-400/10'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                )}
              >
                <motion.span
                  animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Flame className={cn('h-4 w-4', liked && 'fill-current')} />
                </motion.span>
                <span className="tabular-nums">{likeCount}</span>
              </motion.button>
            </div>

            {/* Comment */}
            <Link
              href={`/posts/${post.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="tabular-nums">{post.stats?.commentCount ?? 0}</span>
            </Link>

            <div className="flex-1" />

            {/* Extend */}
            <button
              onClick={() => setShowExtendModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t.posts.extend}</span>
            </button>

            {/* Boost */}
            <button
              onClick={() => setShowBoostModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/40 hover:text-yellow-400/80 hover:bg-yellow-400/10 transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">{t.posts.boost}</span>
            </button>
          </div>
        )}
      </motion.div>

      <ExtendModal
        open={showExtendModal}
        onOpenChange={setShowExtendModal}
        postId={post.id}
        userExtensionCount={0}
        onSuccess={(newExpiry) => {
          setExpiresAt(newExpiry);
          setFuelTrigger((n) => n + 1);
          onUpdate?.({ expiresAt: newExpiry.toISOString() });
        }}
      />

      <BoostModal
        open={showBoostModal}
        onOpenChange={setShowBoostModal}
        postId={post.id}
        walletBalance={user?.wallet?.balance ?? 0}
        onSuccess={(newPriority, spentAmount) => {
          setFuelTrigger((n) => n + 1);
          onUpdate?.({ boostPriority: newPriority });
          updateWalletBalance(-spentAmount);
        }}
      />
    </>
  );
}
