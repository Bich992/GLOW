import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';
import { COMMENT_POOL } from '../content/comments';

interface FeedPost { id: string; content: string }

export async function actionComment(bot: BotPersona, session: BotSession): Promise<void> {
  const feedRes = await apiCall<{ posts?: FeedPost[] }>(
    session, 'GET', '/api/feed/foryou?limit=10'
  );
  const posts = feedRes.data.posts ?? [];
  if (posts.length === 0) return;

  // Weight towards posts containing bot's tags
  const taggedPosts = posts.filter((p) =>
    bot.tags.some((tag) => p.content.toLowerCase().includes(tag))
  );
  const candidates = taggedPosts.length > 0 ? taggedPosts : posts;
  const post = candidates[Math.floor(Math.random() * candidates.length)]!;

  const commentText = COMMENT_POOL[Math.floor(Math.random() * COMMENT_POOL.length)]!;
  // Ensure comment >= 20 chars for FUEL qualification
  const content = commentText.length >= 20 ? commentText : commentText + ' — davvero interessante.';

  const start = Date.now();
  const res = await apiCall(session, 'POST', '/api/comments', {
    postId: post.id,
    content,
  });

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'comment',
    postId: post.id,
    statusCode: res.status,
    latencyMs: Date.now() - start,
  });
}
