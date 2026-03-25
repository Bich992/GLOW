/**
 * Bot action: Arena long-press presence event.
 *
 * Archetype behaviour:
 *   arena_lurker  — attracted to #Bellezza / #Adrenalina; 3-8 s on match, 0.5-1.5 s on miss
 *   arena_hunter  — looks at any hidden post for 6-10 s to assess bet opportunity
 *   vain_creator  — self-views 15-30 s (farming attempt, will be capped)
 *   spammer       — always picks the first post and watches 20-30 s (exploit test)
 */

import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';

interface ArenaPost {
  id: string;
  tags?: string[];
  authorId?: string;
  scout_count?: number;
  arena_state?: string;
  createdAt?: string;
}

interface FeedResponse {
  posts?: ArenaPost[];
}

interface PresenceResponse {
  status?: string;
  ttlDeltaSeconds?: number;
  bloomed?: boolean;
}

const ATTRACTIVE_TAGS = ['#Bellezza', '#Adrenalina', '#Arte'];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Fetches Arena (hidden) posts from the feed. */
async function fetchArenaFeed(session: BotSession): Promise<ArenaPost[]> {
  const res = await apiCall<FeedResponse>(session, 'GET', '/api/feed/foryou?arena=true&limit=20');
  return (res.data.posts ?? []).filter((p) => p.arena_state === 'hidden');
}

export async function actionArenaPresence(
  bot: BotPersona,
  session: BotSession
): Promise<void> {
  const posts = await fetchArenaFeed(session);
  if (posts.length === 0) return;

  let targetPost: ArenaPost;
  let durationMs: number;

  switch (bot.archetype) {
    case 'arena_lurker': {
      const attractive = posts.filter((p) =>
        (p.tags ?? []).some((t) => ATTRACTIVE_TAGS.includes(t))
      );
      targetPost = attractive.length > 0
        ? attractive[Math.floor(Math.random() * attractive.length)]!
        : posts[Math.floor(Math.random() * posts.length)]!;

      const isAttractive = (targetPost.tags ?? []).some((t) => ATTRACTIVE_TAGS.includes(t));
      durationMs = isAttractive ? rand(3_000, 8_000) : rand(500, 1_500);
      break;
    }

    case 'arena_hunter': {
      const now = Date.now();
      const targets = posts
        .filter((p) => (p.scout_count ?? 0) < 5 &&
          now - new Date(p.createdAt ?? 0).getTime() < 60_000)
        .sort((a, b) => (a.scout_count ?? 0) - (b.scout_count ?? 0));

      targetPost = targets[0] ?? posts[Math.floor(Math.random() * posts.length)]!;
      durationMs = rand(6_000, 10_000);
      break;
    }

    case 'vain_creator': {
      // Selfie spammer only briefly glances at others; long self-views are simulated
      // by always watching the most-selfie-tagged post
      const selfies = posts.filter((p) => (p.tags ?? []).includes('#selfie'));
      targetPost = selfies.length > 0
        ? selfies[Math.floor(Math.random() * selfies.length)]!
        : posts[Math.floor(Math.random() * posts.length)]!;
      durationMs = rand(15_000, 30_000); // farming attempt — will be capped/diminished
      break;
    }

    case 'spammer': {
      targetPost = posts[0]!;
      durationMs = rand(20_000, 30_000);
      break;
    }

    default: {
      targetPost = posts[Math.floor(Math.random() * posts.length)]!;
      durationMs = rand(2_000, 6_000);
    }
  }

  const start = Date.now();
  const res = await apiCall<PresenceResponse>(
    session,
    'POST',
    `/api/posts/${targetPost.id}/presence`,
    { duration_ms: durationMs }
  );

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'arena_presence',
    postId: targetPost.id,
    statusCode: res.status,
    latencyMs: Date.now() - start,
    durationMs,
    presenceStatus: res.data?.status,
    ttlDelta: res.data?.ttlDeltaSeconds,
    bloomed: res.data?.bloomed,
  });
}
