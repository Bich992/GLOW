import { BOT_PERSONAS, ACTION_WEIGHTS, WAKE_PROBABILITY, type BotAction, type BotPersona } from './config';
import type { BotSession } from './utils/client';
import { actionPost } from './actions/post';
import { actionLike } from './actions/like';
import { actionComment } from './actions/comment';
import { actionBoost } from './actions/boost';
import { actionEcho } from './actions/echo';
import { actionCrystallise } from './actions/crystallise';
import { actionFollow } from './actions/follow';
import { actionArenaPresence } from './actions/presence';
import { actionArenaBet } from './actions/bet';

// ── Safety guard ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_BOTS_PROD) {
  throw new Error('Bots must not run against production without ALLOW_BOTS_PROD=true');
}

const BOT_TICK_MS = parseInt(process.env.BOT_TICK_MS ?? '30000', 10);

/** Weighted random selection from an action weight map. */
function pickAction(weights: Partial<Record<BotAction, number>>): BotAction | null {
  const entries = Object.entries(weights) as [BotAction, number][];
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;

  for (const [action, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return action;
  }

  return entries[entries.length - 1]![0];
}

async function runAction(
  bot: BotPersona,
  action: BotAction,
  session: BotSession
): Promise<void> {
  try {
    switch (action) {
      case 'post':            return actionPost(bot, session);
      case 'like':            return actionLike(bot, session);
      case 'comment':         return actionComment(bot, session);
      case 'boost':           return actionBoost(bot, session);
      case 'echo':            return actionEcho(bot, session);
      case 'crystallise':     return actionCrystallise(bot, session);
      case 'follow':          return actionFollow(bot, session);
      case 'arena_presence':  return actionArenaPresence(bot, session);
      case 'arena_bet':       return actionArenaBet(bot, session);
    }
  } catch (e) {
    process.stderr.write(
      JSON.stringify({ ts: new Date().toISOString(), bot: bot.username, action, error: String(e) }) + '\n'
    );
  }
}

export async function runBots(
  sessions: Map<string, BotSession>,
  durationMs: number
): Promise<void> {
  const end = Date.now() + durationMs;

  while (Date.now() < end) {
    const tickStart = Date.now();

    const promises: Promise<void>[] = [];

    for (const bot of BOT_PERSONAS) {
      const session = sessions.get(bot.id);
      if (!session) continue;

      const wakes = Math.random() < WAKE_PROBABILITY[bot.activityLevel];
      if (!wakes) continue;

      const weights = ACTION_WEIGHTS[bot.archetype];
      const action = pickAction(weights);
      if (!action) continue;

      promises.push(runAction(bot, action, session));
    }

    await Promise.allSettled(promises);

    const elapsed = Date.now() - tickStart;
    const sleep = Math.max(0, BOT_TICK_MS - elapsed);
    if (sleep > 0) await new Promise((r) => setTimeout(r, sleep));
  }
}
