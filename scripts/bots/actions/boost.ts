import type { BotPersona } from '../config';
import type { BotSession } from '../utils/client';
import { apiCall } from '../utils/client';
import { logAction } from '../utils/logger';

interface FeedPost { id: string; fuelPointsTotal: number }
interface WalletData { balance?: number }

export async function actionBoost(bot: BotPersona, session: BotSession): Promise<void> {
  // Check wallet balance first
  const walletRes = await apiCall<WalletData>(session, 'GET', '/api/wallet');
  const balance = walletRes.data.balance ?? 0;
  if (balance < 2) return; // minimum viable boost

  const feedRes = await apiCall<{ posts?: FeedPost[] }>(
    session, 'GET', '/api/feed/foryou?limit=10'
  );
  const posts = feedRes.data.posts ?? [];
  if (posts.length === 0) return;

  // Pick post with highest fuel_points_total (likely to crystallise)
  const target = posts.reduce((best, p) =>
    p.fuelPointsTotal > best.fuelPointsTotal ? p : best
  );

  const amount = +(Math.random() * 2.5 + 0.5).toFixed(2); // 0.5–3.0
  const actualAmount = Math.min(amount, balance - 0.5);
  if (actualAmount < 0.5) return;

  const start = Date.now();
  const res = await apiCall(session, 'POST', `/api/posts/${target.id}/boost`, {
    amount: actualAmount,
  });

  logAction({
    ts: new Date().toISOString(),
    bot: bot.username,
    action: 'boost',
    postId: target.id,
    statusCode: res.status,
    latencyMs: Date.now() - start,
  });
}
