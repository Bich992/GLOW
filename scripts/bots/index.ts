#!/usr/bin/env ts-node
/**
 * Ghost User Bot CLI
 *
 * Commands:
 *   provision              — create all 10 bot accounts + seed 20 FUEL each
 *   run --duration=<d>     — run bots for given duration (e.g. 1h, 30m, 5m)
 *   run-once --bot=<name> --action=<action>
 *   report                 — print activity summary from last session
 */

import * as fs from 'fs';
import * as path from 'path';
import { BOT_PERSONAS } from './config';
import type { BotSession } from './utils/client';
import { apiCall } from './utils/client';
import { runBots } from './engine';
import { logAction } from './utils/logger';

const SESSION_FILE = path.join(process.cwd(), '.bots-session.json');
const BASE_URL = process.env.BOT_BASE_URL ?? 'http://localhost:3000';

type Sessions = Record<string, string>; // botId → sessionCookie

function parseDuration(str: string): number {
  const match = str.match(/^(\d+)(h|m|s)$/);
  if (!match) throw new Error(`Invalid duration: ${str}. Use e.g. 1h, 30m, 5m`);
  const [, num, unit] = match as [string, string, 'h' | 'm' | 's'];
  const n = parseInt(num, 10);
  return unit === 'h' ? n * 3_600_000 : unit === 'm' ? n * 60_000 : n * 1_000;
}

function loadSessions(): Sessions {
  if (!fs.existsSync(SESSION_FILE)) return {};
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as Sessions;
}

function saveSessions(sessions: Sessions): void {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

async function provision(): Promise<void> {
  const sessions: Sessions = {};

  for (const bot of BOT_PERSONAS) {
    // Register
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: bot.email,
        password: bot.password,
        username: bot.username,
        displayName: bot.username,
      }),
    });

    if (!regRes.ok && regRes.status !== 409) {
      process.stderr.write(`Failed to register ${bot.username}: ${regRes.status}\n`);
      continue;
    }

    // Login to get session
    const loginRes = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: bot.email, password: bot.password }),
    });

    if (!loginRes.ok) {
      process.stderr.write(`Failed to login ${bot.username}: ${loginRes.status}\n`);
      continue;
    }

    const setCookie = loginRes.headers.get('set-cookie') ?? '';
    const match = setCookie.match(/timely_session=([^;]+)/);
    const cookie = match?.[1] ?? '';

    if (cookie) {
      sessions[bot.id] = cookie;
    }

    logAction({ ts: new Date().toISOString(), bot: bot.username, action: 'provision', statusCode: regRes.status });
  }

  saveSessions(sessions);

  // Seed 20 FUEL per bot via DB directly (only action that bypasses API)
  try {
    const { prisma } = await import('../../src/lib/db');
    for (const bot of BOT_PERSONAS) {
      const user = await prisma.user.findUnique({ where: { username: bot.username } });
      if (!user) continue;
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet || wallet.balance > 0) continue; // skip if already seeded

      await prisma.wallet.update({
        where: { userId: user.id },
        data: { balance: { increment: 20 } },
      });
      await prisma.tokenTransaction.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          type: 'faucet',
          amount: 20,
          balanceAfter: 20,
          description: 'Bot provision seed',
        },
      });
    }
    process.stdout.write('Seeded 20 FUEL for all bot accounts.\n');
  } catch (e) {
    process.stderr.write(`Warning: Could not seed FUEL via DB: ${String(e)}\n`);
  }

  process.stdout.write(`Provisioned ${Object.keys(sessions).length} bot accounts.\n`);
}

async function runOnce(botUsername: string, action: string): Promise<void> {
  const sessions = loadSessions();
  const bot = BOT_PERSONAS.find((b) => b.username === botUsername);
  if (!bot) throw new Error(`Bot not found: ${botUsername}`);

  const cookie = sessions[bot.id];
  if (!cookie) throw new Error(`No session for ${botUsername}. Run provision first.`);

  const session: BotSession = { botId: bot.id, sessionCookie: cookie };

  const { actionPost } = await import('./actions/post');
  const { actionLike } = await import('./actions/like');
  const { actionComment } = await import('./actions/comment');
  const { actionBoost } = await import('./actions/boost');
  const { actionEcho } = await import('./actions/echo');
  const { actionCrystallise } = await import('./actions/crystallise');
  const { actionFollow } = await import('./actions/follow');

  switch (action) {
    case 'post':        return actionPost(bot, session);
    case 'like':        return actionLike(bot, session);
    case 'comment':     return actionComment(bot, session);
    case 'boost':       return actionBoost(bot, session);
    case 'echo':        return actionEcho(bot, session);
    case 'crystallise': return actionCrystallise(bot, session);
    case 'follow':      return actionFollow(bot, session);
    default:            throw new Error(`Unknown action: ${action}`);
  }
}

async function report(): Promise<void> {
  // Print summary table from session file
  process.stdout.write('Bot activity summary is written to logs/bots-*.ndjson\n');
  process.stdout.write('Use: cat logs/bots-*.ndjson | jq -r \'.bot + " -> " + .action + " (" + (.statusCode|tostring) + ")"\'\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'provision':
      await provision();
      break;

    case 'run': {
      const durationArg = args.find((a) => a.startsWith('--duration='))?.split('=')[1] ?? '30m';
      const durationMs = parseDuration(durationArg);

      const savedSessions = loadSessions();
      const sessionMap = new Map<string, BotSession>(
        BOT_PERSONAS
          .filter((b) => savedSessions[b.id])
          .map((b) => [b.id, { botId: b.id, sessionCookie: savedSessions[b.id]! }])
      );

      process.stderr.write(`Starting bots for ${durationArg} (${sessionMap.size} active)...\n`);
      await runBots(sessionMap, durationMs);
      process.stderr.write('Done.\n');
      break;
    }

    case 'run-once': {
      const botArg = args.find((a) => a.startsWith('--bot='))?.split('=')[1];
      const actionArg = args.find((a) => a.startsWith('--action='))?.split('=')[1];
      if (!botArg || !actionArg) throw new Error('Usage: run-once --bot=<name> --action=<action>');
      await runOnce(botArg, actionArg);
      break;
    }

    case 'report':
      await report();
      break;

    default:
      process.stderr.write('Usage: npx ts-node scripts/bots/index.ts <provision|run|run-once|report>\n');
      process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
