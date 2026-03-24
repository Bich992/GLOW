import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';
import { BOT_PERSONAS } from '../config';

export async function actionFollow(bot: BotPersona, session: BotSession): Promise<void> {
  // Follow a random other bot
  const others = BOT_PERSONAS.filter((b) => b.id !== bot.id);
  const target = others[Math.floor(Math.random() * others.length)]!;

  const start = Date.now();
  const res = await apiCall(session, 'POST', '/api/follow', {
    username: target.username,
  });

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'follow',
    statusCode: res.status,
    latencyMs: Date.now() - start,
  });
}
