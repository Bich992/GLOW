import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';

interface FeedPost {
  id: string;
  fuelPointsTotal: number;
  crystallise_threshold?: number;
}

export async function actionCrystallise(bot: BotPersona, session: BotSession): Promise<void> {
  const feedRes = await apiCall<{ posts?: FeedPost[] }>(
    session, 'GET', '/api/feed/foryou?limit=20'
  );
  const posts = feedRes.data.posts ?? [];
  if (posts.length === 0) return;

  // Pick post closest to crystallise_threshold
  // We don't have threshold in feed response, so pick post with highest fuelPointsTotal
  const target = posts.reduce((best, p) =>
    p.fuelPointsTotal > best.fuelPointsTotal ? p : best
  );

  const start = Date.now();
  const res = await apiCall(session, 'POST', `/api/posts/${target.id}/crystallise`, {});

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'crystallise',
    postId: target.id,
    statusCode: res.status,
    latencyMs: Date.now() - start,
  });
}
