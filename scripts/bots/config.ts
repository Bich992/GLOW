export type BotArchetype =
  | 'lurker'
  | 'creator'
  | 'commenter'
  | 'booster'
  | 'crystalliser'
  | 'influencer';

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
  { id: 'bot_01', username: 'ghost_aria',  email: 'bot_01@glow-test.internal', password: masterPassword, archetype: 'influencer',   activityLevel: 'high',   tags: ['#musica', '#foto'] },
  { id: 'bot_02', username: 'ghost_marco', email: 'bot_02@glow-test.internal', password: masterPassword, archetype: 'creator',      activityLevel: 'medium', tags: ['#illustrazione'] },
  { id: 'bot_03', username: 'ghost_luna',  email: 'bot_03@glow-test.internal', password: masterPassword, archetype: 'commenter',    activityLevel: 'high',   tags: ['#musica', '#poesia'] },
  { id: 'bot_04', username: 'ghost_rex',   email: 'bot_04@glow-test.internal', password: masterPassword, archetype: 'lurker',       activityLevel: 'low',    tags: ['#foto'] },
  { id: 'bot_05', username: 'ghost_nova',  email: 'bot_05@glow-test.internal', password: masterPassword, archetype: 'booster',      activityLevel: 'medium', tags: ['#video', '#arte'] },
  { id: 'bot_06', username: 'ghost_sable', email: 'bot_06@glow-test.internal', password: masterPassword, archetype: 'crystalliser', activityLevel: 'low',    tags: ['#poesia', '#illustrazione'] },
  { id: 'bot_07', username: 'ghost_flux',  email: 'bot_07@glow-test.internal', password: masterPassword, archetype: 'creator',      activityLevel: 'high',   tags: ['#foto', '#video'] },
  { id: 'bot_08', username: 'ghost_dune',  email: 'bot_08@glow-test.internal', password: masterPassword, archetype: 'lurker',       activityLevel: 'low',    tags: ['#musica'] },
  { id: 'bot_09', username: 'ghost_iris',  email: 'bot_09@glow-test.internal', password: masterPassword, archetype: 'commenter',    activityLevel: 'medium', tags: ['#arte', '#design'] },
  { id: 'bot_10', username: 'ghost_kael',  email: 'bot_10@glow-test.internal', password: masterPassword, archetype: 'influencer',   activityLevel: 'high',   tags: ['#video', '#musica'] },
];

export type BotAction =
  | 'post'
  | 'like'
  | 'comment'
  | 'boost'
  | 'echo'
  | 'crystallise'
  | 'follow';

export const ACTION_WEIGHTS: Record<BotArchetype, Partial<Record<BotAction, number>>> = {
  lurker:       { like: 80, follow: 20 },
  creator:      { post: 50, like: 30, follow: 20 },
  commenter:    { comment: 50, like: 30, echo: 20 },
  booster:      { boost: 40, like: 30, comment: 20, follow: 10 },
  crystalliser: { crystallise: 50, like: 30, comment: 20 },
  influencer:   { post: 30, comment: 25, boost: 20, like: 15, echo: 10 },
};

export const WAKE_PROBABILITY: Record<ActivityLevel, number> = {
  low: 0.1,
  medium: 0.35,
  high: 0.65,
};
