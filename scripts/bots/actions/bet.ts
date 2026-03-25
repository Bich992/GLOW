/**
 * Bot action: arena_hunter places a FUEL bet on a promising hidden post.
 *
 * Strategy:
 *   - Fetch Arena feed filtered to hidden posts.
 *   - Pick posts with the lowest scout_count (least competitive).
 *   - Bet a random amount between 5 and 15 FUEL.
 */

import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';

interface ArenaPost {
  id: string;
  scout_count?: number;
  arena_state?: string;
  createdAt?: string;
}

interface FeedResponse {
  posts?: ArenaPost[];
}

interface BetResponse {
  riskCoefficient?: number;
  potentialReward?: number;
}

export async function actionArenaBet(
  bot: BotPersona,
  session: BotSession
): Promise<void> {
  // Only hunters scout-bet
  if (bot.archetype !== 'arena_hunter') return;

  const feedRes = await apiCall<FeedResponse>(
    session,
    'GET',
    '/api/feed/foryou?arena=true&limit=20'
  );
  const posts = (feedRes.data.posts ?? []).filter(
    (p) => p.arena_state === 'hidden'
  );

  if (posts.length === 0) return;

  const now = Date.now();
  const candidates = posts
    .filter((p) => now - new Date(p.createdAt ?? 0).getTime() < 120_000)
    .sort((a, b) => (a.scout_count ?? 0) - (b.scout_count ?? 0));

  const target = candidates[0];
  if (!target) return;

  const betAmount = parseFloat((5 + Math.random() * 10).toFixed(2));

  const start = Date.now();
  const res = await apiCall<BetResponse>(
    session,
    'POST',
    `/api/posts/${target.id}/bet`,
    { fuel_amount: betAmount }
  );

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'arena_bet',
    postId: target.id,
    statusCode: res.status,
    latencyMs: Date.now() - start,
    betAmount,
    riskCoefficient: res.data?.riskCoefficient,
    potentialReward: res.data?.potentialReward,
  });
}
