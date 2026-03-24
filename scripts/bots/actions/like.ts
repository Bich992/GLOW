import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';

interface FeedPost { id: string }

export async function actionLike(bot: BotPersona, session: BotSession): Promise<void> {
  const feedRes = await apiCall<{ posts?: FeedPost[] }>(
    session, 'GET', '/api/feed/foryou?limit=10'
  );
  const posts = feedRes.data.posts ?? [];
  if (posts.length === 0) return;

  const post = posts[Math.floor(Math.random() * posts.length)]!;
  const start = Date.now();
  const res = await apiCall(session, 'POST', '/api/likes', { postId: post.id });

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'like',
    postId: post.id,
    statusCode: res.status,
    latencyMs: Date.now() - start,
  });
}
