export type BotArchetype =
  | 'lurker'
  | 'creator'
  | 'commenter'
  | 'booster'
  | 'crystalliser'
  | 'influencer'
  // ── Arena archetypes ───────────────────────────────────────────────────────
  | 'arena_lurker'   // Passive watcher — generates organic TTL via long-press
  | 'arena_hunter'   // Strategic scout — bets FUEL on low-scout-count posts
  | 'vain_creator'   // Content spammer — tests bounce-rate elimination
  | 'spammer';       // Anti-farming stress test — loops same post for 1h

export type ActivityLevel = 'low' | 'medium' | 'high';

export interface BotPersona {
  id: string;
  username: string;
  email: string;
  password: string;
  archetype: BotArchetype;
  activityLevel: ActivityLevel;
  tags: string[];
}

const masterPassword = process.env.BOT_MASTER_PASSWORD ?? 'Bot$ecret2026!';

export const BOT_PERSONAS: BotPersona[] = [
  // ── Original personas ──────────────────────────────────────────────────────
  { id: 'bot_01', username: 'ghost_aria',   email: 'bot_01@glow-test.internal', password: masterPassword, archetype: 'influencer',   activityLevel: 'high',   tags: ['#musica', '#foto'] },
  { id: 'bot_02', username: 'ghost_marco',  email: 'bot_02@glow-test.internal', password: masterPassword, archetype: 'creator',      activityLevel: 'medium', tags: ['#illustrazione'] },
  { id: 'bot_03', username: 'ghost_luna',   email: 'bot_03@glow-test.internal', password: masterPassword, archetype: 'commenter',    activityLevel: 'high',   tags: ['#musica', '#poesia'] },
  { id: 'bot_04', username: 'ghost_rex',    email: 'bot_04@glow-test.internal', password: masterPassword, archetype: 'lurker',       activityLevel: 'low',    tags: ['#foto'] },
  { id: 'bot_05', username: 'ghost_nova',   email: 'bot_05@glow-test.internal', password: masterPassword, archetype: 'booster',      activityLevel: 'medium', tags: ['#video', '#arte'] },
  { id: 'bot_06', username: 'ghost_sable',  email: 'bot_06@glow-test.internal', password: masterPassword, archetype: 'crystalliser', activityLevel: 'low',    tags: ['#poesia', '#illustrazione'] },
  { id: 'bot_07', username: 'ghost_flux',   email: 'bot_07@glow-test.internal', password: masterPassword, archetype: 'creator',      activityLevel: 'high',   tags: ['#foto', '#video'] },
  { id: 'bot_08', username: 'ghost_dune',   email: 'bot_08@glow-test.internal', password: masterPassword, archetype: 'lurker',       activityLevel: 'low',    tags: ['#musica'] },
  { id: 'bot_09', username: 'ghost_iris',   email: 'bot_09@glow-test.internal', password: masterPassword, archetype: 'commenter',    activityLevel: 'medium', tags: ['#arte', '#design'] },
  { id: 'bot_10', username: 'ghost_kael',   email: 'bot_10@glow-test.internal', password: masterPassword, archetype: 'influencer',   activityLevel: 'high',   tags: ['#video', '#musica'] },
  // ── Arena personas ─────────────────────────────────────────────────────────
  { id: 'bot_11', username: 'arena_watcher', email: 'bot_11@glow-test.internal', password: masterPassword, archetype: 'arena_lurker',  activityLevel: 'high',   tags: ['#Bellezza', '#Arte'] },
  { id: 'bot_12', username: 'arena_stalker', email: 'bot_12@glow-test.internal', password: masterPassword, archetype: 'arena_lurker',  activityLevel: 'medium', tags: ['#Adrenalina', '#foto'] },
  { id: 'bot_13', username: 'arena_scout1',  email: 'bot_13@glow-test.internal', password: masterPassword, archetype: 'arena_hunter',  activityLevel: 'high',   tags: ['#Bellezza'] },
  { id: 'bot_14', username: 'arena_scout2',  email: 'bot_14@glow-test.internal', password: masterPassword, archetype: 'arena_hunter',  activityLevel: 'medium', tags: ['#Arte', '#musica'] },
  { id: 'bot_15', username: 'vain_selfie',   email: 'bot_15@glow-test.internal', password: masterPassword, archetype: 'vain_creator',  activityLevel: 'high',   tags: ['#selfie', '#Bellezza'] },
  { id: 'bot_16', username: 'spam_bot_1',    email: 'bot_16@glow-test.internal', password: masterPassword, archetype: 'spammer',       activityLevel: 'high',   tags: [] },
];

export type BotAction =
  | 'post'
  | 'like'
  | 'comment'
  | 'boost'
  | 'echo'
  | 'crystallise'
  | 'follow'
  | 'arena_presence'  // Long-press viewing event
  | 'arena_bet';      // Place FUEL bet on a hidden post

export const ACTION_WEIGHTS: Record<BotArchetype, Partial<Record<BotAction, number>>> = {
  lurker:        { like: 80, follow: 20 },
  creator:       { post: 50, like: 30, follow: 20 },
  commenter:     { comment: 50, like: 30, echo: 20 },
  booster:       { boost: 40, like: 30, comment: 20, follow: 10 },
  crystalliser:  { crystallise: 50, like: 30, comment: 20 },
  influencer:    { post: 30, comment: 25, boost: 20, like: 15, echo: 10 },
  // Arena archetypes
  arena_lurker:  { arena_presence: 90, like: 10 },
  arena_hunter:  { arena_presence: 50, arena_bet: 40, like: 10 },
  vain_creator:  { post: 70, arena_presence: 30 },
  spammer:       { arena_presence: 100 },
};

export const WAKE_PROBABILITY: Record<ActivityLevel, number> = {
  low: 0.1,
  medium: 0.35,
  high: 0.65,
};
