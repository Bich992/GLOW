import type { BotAction } from '../config';

export interface BotLogEntry {
  ts: string;
  bot: string;
  action: BotAction | 'provision' | 'report';
  postId?: string;
  statusCode?: number;
  latencyMs?: number;
  fuel_balance_after?: number;
  error?: string;
  [key: string]: unknown;
}

export function logAction(entry: BotLogEntry): void {
  process.stdout.write(JSON.stringify(entry) + '\n');
}
