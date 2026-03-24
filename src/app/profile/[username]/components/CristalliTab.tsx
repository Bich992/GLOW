'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CrystallisedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  voteCount: number;
  voters: { username: string; avatarUrl: string | null }[];
}

type SortKey = 'newest' | 'oldest' | 'votes_desc' | 'votes_asc';
type MediaFilter = 'all' | 'image' | 'audio' | 'video' | 'text';

interface CristalliTabProps {
  posts: CrystallisedPost[];
}

function mediaType(post: CrystallisedPost): 'image' | 'audio' | 'video' | 'text' {
  if (post.imageUrl) return 'image';
  if (post.audioUrl) return 'audio';
  if (post.videoUrl) return 'video';
  return 'text';
}

export function CristalliTab({ posts }: CristalliTabProps) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [lightboxPost, setLightboxPost] = useState<CrystallisedPost | null>(null);

  const filtered = posts
    .filter((p) => mediaFilter === 'all' || mediaType(p) === mediaFilter)
    .sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'votes_desc': return b.voteCount - a.voteCount;
        case 'votes_asc': return a.voteCount - b.voteCount;
      }
    });

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <span className="text-5xl opacity-30">💎</span>
        <p className="text-sm max-w-xs">
          Nessun cristallo ancora. La community non ha ancora immortalato nessun tuo post.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs"
        >
          <option value="newest">Più recenti</option>
          <option value="oldest">Più vecchi</option>
          <option value="votes_desc">Più votati</option>
          <option value="votes_asc">Meno votati</option>
        </select>
        <select
          value={mediaFilter}
          onChange={(e) => setMediaFilter(e.target.value as MediaFilter)}
          className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs"
        >
          <option value="all">Tutti i tipi</option>
          <option value="image">Immagine</option>
          <option value="audio">Audio</option>
          <option value="video">Video</option>
          <option value="text">Solo testo</option>
        </select>
      </div>

      {/* Masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
        {filtered.map((post) => (
          <div
            key={post.id}
            onClick={() => setLightboxPost(post)}
            className="cristallo-shimmer relative break-inside-avoid rounded-xl ring-2 ring-cyan-400/40 backdrop-blur-sm bg-card/60 p-4 cursor-pointer hover:ring-cyan-400/60 transition-all"
          >
            {/* Badge */}
            <span className="absolute top-2.5 right-2.5 rounded-full bg-cyan-950/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 ring-1 ring-cyan-500/40">
              💎 Cristallizzato
            </span>
            <span className="absolute top-7 right-2.5 mt-0.5 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              {post.voteCount} voti
            </span>

            <p className="mt-6 text-sm leading-relaxed">{post.content}</p>

            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt=""
                className="mt-3 w-full rounded-lg object-cover max-h-64"
              />
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-cyan-950/60 px-3 py-1 text-xs font-semibold text-cyan-300">
                  💎 Cristallizzato
                </span>
                <button
                  onClick={() => setLightboxPost(null)}
                  className="text-muted-foreground hover:text-foreground text-xl leading-none"
                >
                  ×
                </button>
              </div>

              <p className="text-sm leading-relaxed">{lightboxPost.content}</p>

              {lightboxPost.imageUrl && (
                <img src={lightboxPost.imageUrl} alt="" className="w-full rounded-lg" />
              )}
              {lightboxPost.audioUrl && (
                <audio controls src={lightboxPost.audioUrl} className="w-full" />
              )}
              {lightboxPost.videoUrl && (
                <video controls src={lightboxPost.videoUrl} className="w-full rounded-lg" />
              )}

              {/* Voters */}
              {lightboxPost.voters.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {lightboxPost.voteCount} voti dalla community
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {lightboxPost.voters.map((v) => (
                      <span
                        key={v.username}
                        className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs"
                      >
                        {v.avatarUrl ? (
                          <img src={v.avatarUrl} alt="" className="h-4 w-4 rounded-full" />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-muted" />
                        )}
                        @{v.username}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Share */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/cristallo/${lightboxPost.id}`;
                  void navigator.clipboard.writeText(url);
                }}
                className="w-full rounded-lg border border-border py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                🔗 Copia permalink
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
