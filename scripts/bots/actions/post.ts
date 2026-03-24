import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';
import { POST_POOL } from '../content/posts';

// 1×1 transparent PNG (data URI base64)
const PLACEHOLDER_IMAGE_URL =
  'https://via.placeholder.com/1x1.png/000000/000000?text=.';

export async function actionPost(bot: BotPersona, session: BotSession): Promise<void> {
  const entry = POST_POOL[Math.floor(Math.random() * POST_POOL.length)]!;
  const content = `${entry.text} ${entry.tags.join(' ')}`;

  const start = Date.now();
  const res = await apiCall<{ id?: string }>(session, 'POST', '/api/posts', {
    content,
    imageUrl: PLACEHOLDER_IMAGE_URL,
  });

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'post',
    postId: res.data.id,
    statusCode: res.status,
    latencyMs: Date.now() - start,
  });
}
