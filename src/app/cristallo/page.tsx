import React from 'react';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const metadata = { title: 'Il Cristallo — GLOW' };

export default async function CristalloPage() {
  const posts = await prisma.post.findMany({
    where: { is_crystallised: true },
    orderBy: [
      { crystallise_votes: { _count: 'desc' } },
      { born_at: 'desc' },
    ],
    include: {
      author: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { crystallise_votes: true } },
      stats: { select: { likeCount: true, commentCount: true } },
    },
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">💎 Il Cristallo</h1>
        <p className="text-muted-foreground">
          Posts crystallised by the community — preserved forever.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">
          No crystallised posts yet. Be the first to crystallise something extraordinary.
        </p>
      ) : (
        <div
          className="gap-4"
          style={{
            columns: 'auto 280px',
            columnGap: '1rem',
          }}
        >
          {posts.map((post) => (
            <div key={post.id} className="break-inside-avoid mb-4">
              <Link href={`/posts/${post.id}`}>
                <div className="rounded-xl bg-[#111111] ring-2 ring-cyan-400/60 p-4 shadow-[inset_0_0_12px_rgba(34,211,238,0.07)] hover:ring-cyan-400/90 transition-all">
                  {/* Author */}
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={post.author.avatarUrl ?? undefined} alt={post.author.displayName} />
                      <AvatarFallback>{post.author.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{post.author.displayName}</p>
                      <p className="text-xs text-muted-foreground">@{post.author.username}</p>
                    </div>
                    <span className="ml-auto text-xs bg-cyan-400/20 text-cyan-400 rounded-full px-2 py-0.5 font-semibold">
                      💎 Cristallizzato
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-sm mb-3 line-clamp-6">{post.content}</p>

                  {post.imageUrl && (
                    <Image
                      src={post.imageUrl}
                      alt=""
                      width={400}
                      height={300}
                      className="w-full rounded-lg object-cover mb-3"
                    />
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>💎 {post._count.crystallise_votes} votes</span>
                    <span>❤ {post.stats?.likeCount ?? 0}</span>
                    <span>💬 {post.stats?.commentCount ?? 0}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
