#!/usr/bin/env tsx
/**
 * Arena Economy Simulator
 * ════════════════════════
 * Pure in-memory simulation — no HTTP, no database.
 *
 * Models 1 000 interactions per simulated second across:
 *   700 Lurkers       (passive watchers — organic TTL generation)
 *   200 Hunters       (strategic scouts — bet on low-competition posts)
 *   100 VainCreators  (selfie spammers — tests bounce-rate elimination)
 *    + 1 Spammer      (exploit bot — loops same post for 1 virtual hour)
 *
 * Output:
 *   - Posts bloomed vs. expired
 *   - Average post lifetime: VIP author vs. Pioneer author
 *   - Spammer neutralisation proof (contribution flattens after 15 s)
 *   - Economy health (total FUEL earned vs. bet)
 */

import {
  ARENA_MAX_TTL_SECONDS,
  BOUNCE_THRESHOLD_MS,
  REWARD_THRESHOLD_MS,
  calculateDiminishingRate,
  calculateEffectiveContribution,
  calculateTtlDelta,
  calculateDynamicThreshold,
  calculateRiskCoefficient,
  calculatePotentialReward,
  clampArenaMaxTtl,
} from '../src/lib/arena-engine';

// ── Simulation config ──────────────────────────────────────────────────────────
const INTERACTIONS_PER_TICK = 1_000;
const TICK_DURATION_VIRTUAL_S = 1;   // each tick = 1 simulated second
const SIMULATION_VIRTUAL_MINUTES = 60;
const TOTAL_TICKS = SIMULATION_VIRTUAL_MINUTES * 60;

const NUM_LURKERS       = 700;
const NUM_HUNTERS       = 200;
const NUM_VAIN_CREATORS = 100;

const DAU = 5_000; // Simulated daily active users (for dynamic threshold)

// ── Types ──────────────────────────────────────────────────────────────────────
type AuthorTier = 'vip' | 'pioneer';

interface SimPost {
  id: string;
  authorTier: AuthorTier;
  authorFollowers: number;
  tags: string[];
  ttlSeconds: number;
  totalPresenceMs: number;
  thresholdPresenceMs: number;
  scoutCount: number;
  totalFuelBet: number;
  state: 'hidden' | 'revealed' | 'expired';
  bornAtTick: number;
  resolvedAtTick?: number;
}

interface UserPresence {
  totalDurationMs: number;
  contributionMs: number;
}

interface Bet {
  fuelInvested: number;
  potentialReward: number;
  settled: boolean;
}

interface SimState {
  tick: number;
  posts: SimPost[];
  postPresence: Map<string, Map<string, UserPresence>>; // postId → userId → presence
  bets: Map<string, Bet[]>; // postId → bets
  stats: {
    bloomed: number;
    expired: number;
    totalFuelEarned: number;
    totalFuelBet: number;
    vipLifetimeSeconds: number[];
    pioneerLifetimeSeconds: number[];
    spammerContributions: number[]; // per-tick capped contribution of spammer
    bouncePenalties: number;
    rewards: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
let postCounter = 0;
function makePost(tier: AuthorTier, tick: number): SimPost {
  const id = `post_${++postCounter}`;
  const followers = tier === 'vip' ? 500_000 + Math.random() * 500_000 : Math.random() * 100;
  const ATTRACTIVE_TAGS = ['#Bellezza', '#Adrenalina'];
  const ALL_TAGS = [...ATTRACTIVE_TAGS, '#Moda', '#random', '#selfie'];
  const tags = tier === 'vain_creator' as unknown
    ? ['#selfie', '#Bellezza']
    : [ALL_TAGS[Math.floor(Math.random() * ALL_TAGS.length)]!];

  return {
    id,
    authorTier: tier,
    authorFollowers: Math.round(followers),
    tags,
    ttlSeconds: 300,           // 5 minute base
    totalPresenceMs: 0,
    thresholdPresenceMs: calculateDynamicThreshold(DAU),
    scoutCount: 0,
    totalFuelBet: 0,
    state: 'hidden',
    bornAtTick: tick,
  };
}

function getOrCreatePresence(
  state: SimState,
  postId: string,
  userId: string
): UserPresence {
  if (!state.postPresence.has(postId)) {
    state.postPresence.set(postId, new Map());
  }
  const postMap = state.postPresence.get(postId)!;
  if (!postMap.has(userId)) {
    postMap.set(userId, { totalDurationMs: 0, contributionMs: 0 });
  }
  return postMap.get(userId)!;
}

function applyPresenceEvent(
  state: SimState,
  post: SimPost,
  userId: string,
  durationMs: number
): void {
  if (post.state !== 'hidden') return;

  const presence = getOrCreatePresence(state, post.id, userId);

  const effectiveContrib = calculateEffectiveContribution(
    durationMs,
    presence.totalDurationMs,
    presence.contributionMs,
    post.ttlSeconds
  );

  const ttlDelta = calculateTtlDelta(durationMs, effectiveContrib);

  // Update presence record
  presence.totalDurationMs += durationMs;
  presence.contributionMs += effectiveContrib;

  // Update post TTL
  const newTtl = clampArenaMaxTtl(post.ttlSeconds + ttlDelta);
  post.ttlSeconds = newTtl;

  // Accumulate presence for Bloom
  if (durationMs >= REWARD_THRESHOLD_MS) {
    post.totalPresenceMs += effectiveContrib;
    state.stats.totalFuelEarned += (durationMs / 1_000) * 0.01; // 0.01 FUEL/s
    state.stats.rewards++;
  } else if (durationMs < BOUNCE_THRESHOLD_MS) {
    state.stats.bouncePenalties++;
  }

  // Check Bloom
  if (!post.state || post.state === 'hidden') {
    if (post.totalPresenceMs >= post.thresholdPresenceMs) {
      post.state = 'revealed';
      post.resolvedAtTick = state.tick;
      state.stats.bloomed++;

      // Settle bets
      const postBets = state.bets.get(post.id) ?? [];
      for (const bet of postBets) {
        if (!bet.settled) {
          bet.settled = true;
          state.stats.totalFuelEarned += bet.potentialReward;
        }
      }

      // Record lifetime
      const lifetimeSec = (state.tick - post.bornAtTick) * TICK_DURATION_VIRTUAL_S;
      if (post.authorTier === 'vip') {
        state.stats.vipLifetimeSeconds.push(lifetimeSec);
      } else {
        state.stats.pioneerLifetimeSeconds.push(lifetimeSec);
      }
    }
  }
}

function placeBet(
  state: SimState,
  post: SimPost,
  _userId: string,
  fuelAmount: number
): void {
  if (post.state !== 'hidden') return;

  const riskCoeff = calculateRiskCoefficient(post.authorFollowers);
  const potentialReward = calculatePotentialReward(fuelAmount, riskCoeff);

  if (!state.bets.has(post.id)) state.bets.set(post.id, []);
  state.bets.get(post.id)!.push({ fuelInvested: fuelAmount, potentialReward, settled: false });

  post.scoutCount++;
  post.totalFuelBet += fuelAmount;
  state.stats.totalFuelBet += fuelAmount;
}

// ── Tick the world clock ───────────────────────────────────────────────────────
function tickTime(state: SimState): void {
  for (const post of state.posts) {
    if (post.state === 'hidden') {
      post.ttlSeconds -= TICK_DURATION_VIRTUAL_S;
      if (post.ttlSeconds <= 0) {
        post.state = 'expired';
        post.resolvedAtTick = state.tick;
        state.stats.expired++;

        const lifetimeSec = (state.tick - post.bornAtTick) * TICK_DURATION_VIRTUAL_S;
        if (post.authorTier === 'vip') {
          state.stats.vipLifetimeSeconds.push(lifetimeSec);
        } else {
          state.stats.pioneerLifetimeSeconds.push(lifetimeSec);
        }
      }
    }
  }
}

// ── Bot interaction logic ──────────────────────────────────────────────────────
const ATTRACTIVE_TAGS = ['#Bellezza', '#Adrenalina'];

function lurkerInteract(state: SimState, userId: string): void {
  const available = state.posts.filter((p) => p.state === 'hidden');
  if (available.length === 0) return;

  const attractive = available.filter((p) =>
    p.tags.some((t) => ATTRACTIVE_TAGS.includes(t))
  );
  const post = attractive.length > 0
    ? attractive[Math.floor(Math.random() * attractive.length)]!
    : available[Math.floor(Math.random() * available.length)]!;

  const isAttractive = post.tags.some((t) => ATTRACTIVE_TAGS.includes(t));
  const duration = isAttractive
    ? 3_000 + Math.random() * 5_000   // 3–8 s
    : 500 + Math.random() * 1_000;    // 0.5–1.5 s (likely bounce)

  applyPresenceEvent(state, post, userId, duration);
}

function hunterInteract(state: SimState, userId: string): void {
  const available = state.posts.filter((p) => p.state === 'hidden');
  if (available.length === 0) return;

  const now = state.tick;
  const targets = available
    .filter((p) => p.scoutCount < 5 && now - p.bornAtTick < 60)
    .sort((a, b) => a.scoutCount - b.scoutCount);

  const post = targets[0] ?? available[Math.floor(Math.random() * available.length)]!;

  // Always assess for 6-10 s
  const duration = 6_000 + Math.random() * 4_000;
  applyPresenceEvent(state, post, userId, duration);

  // 40% chance to also place a bet
  if (Math.random() < 0.4) {
    const betAmount = 5 + Math.random() * 10;
    placeBet(state, post, userId, betAmount);
  }
}

function vainCreatorInteract(state: SimState, userId: string): void {
  const available = state.posts.filter((p) => p.state === 'hidden');
  if (available.length === 0) return;

  // Selfie-poster: picks their own post (simulated: last post published, or any)
  // We simulate "own post" as the one with the tag #selfie
  const ownPosts = available.filter((p) => p.tags.includes('#selfie'));
  const post = ownPosts.length > 0
    ? ownPosts[Math.floor(Math.random() * ownPosts.length)]!
    : available[Math.floor(Math.random() * available.length)]!;

  // Long self-viewing (farming attempt — will be diminished/capped)
  const duration = 15_000 + Math.random() * 15_000;
  applyPresenceEvent(state, post, userId, duration);
}

// ── Spammer: always loops same post ───────────────────────────────────────────
const spammerPresenceCache: Map<string, UserPresence> = new Map();

function spammerInteract(
  state: SimState,
  targetPostId: string
): { contributionThisTick: number } {
  const post = state.posts.find((p) => p.id === targetPostId);
  if (!post || post.state !== 'hidden') return { contributionThisTick: 0 };

  const userId = 'spammer_user';
  const presence = getOrCreatePresence(state, post.id, userId);

  // Spammer simulates 25 s per tick
  const durationMs = 25_000;

  const effectiveContrib = calculateEffectiveContribution(
    durationMs,
    presence.totalDurationMs,
    presence.contributionMs,
    post.ttlSeconds
  );

  presence.totalDurationMs += durationMs;
  presence.contributionMs += effectiveContrib;

  const ttlDelta = effectiveContrib > 0 ? effectiveContrib / 1_000 : 0;
  post.ttlSeconds = clampArenaMaxTtl(post.ttlSeconds + ttlDelta);
  if (effectiveContrib > 0) post.totalPresenceMs += effectiveContrib;

  return { contributionThisTick: effectiveContrib };
}

// ── Main simulation ────────────────────────────────────────────────────────────
function runSimulation(): void {
  console.log('\n🏟️  ARENA ECONOMY SIMULATOR');
  console.log('═'.repeat(60));
  console.log(`DAU: ${DAU.toLocaleString()} | Bloom threshold: ${calculateDynamicThreshold(DAU).toLocaleString()} ms`);
  console.log(`Simulation: ${SIMULATION_VIRTUAL_MINUTES} virtual minutes | ${TOTAL_TICKS} ticks | ${INTERACTIONS_PER_TICK} interactions/tick`);
  console.log('─'.repeat(60));

  const state: SimState = {
    tick: 0,
    posts: [],
    postPresence: new Map(),
    bets: new Map(),
    stats: {
      bloomed: 0,
      expired: 0,
      totalFuelEarned: 0,
      totalFuelBet: 0,
      vipLifetimeSeconds: [],
      pioneerLifetimeSeconds: [],
      spammerContributions: [],
      bouncePenalties: 0,
      rewards: 0,
    },
  };

  // Seed 50 posts at start: 25 VIP authors, 25 Pioneers
  for (let i = 0; i < 25; i++) state.posts.push(makePost('vip', 0));
  for (let i = 0; i < 25; i++) state.posts.push(makePost('pioneer', 0));

  // Spammer targets the first available post
  const spammerTarget = state.posts.find((p) => p.state === 'hidden')!;

  for (let tick = 0; tick < TOTAL_TICKS; tick++) {
    state.tick = tick;

    // Spawn new posts every 30 ticks (30 virtual seconds)
    if (tick % 30 === 0 && tick > 0) {
      for (let i = 0; i < 3; i++) {
        state.posts.push(makePost(Math.random() < 0.2 ? 'vip' : 'pioneer', tick));
      }
    }

    // Distribute 1000 interactions across bot types
    const lurkerInteractions       = Math.round(INTERACTIONS_PER_TICK * 0.70);
    const hunterInteractions       = Math.round(INTERACTIONS_PER_TICK * 0.20);
    const vainCreatorInteractions  = Math.round(INTERACTIONS_PER_TICK * 0.10);

    for (let i = 0; i < lurkerInteractions; i++) {
      lurkerInteract(state, `lurker_${i % NUM_LURKERS}`);
    }
    for (let i = 0; i < hunterInteractions; i++) {
      hunterInteract(state, `hunter_${i % NUM_HUNTERS}`);
    }
    for (let i = 0; i < vainCreatorInteractions; i++) {
      vainCreatorInteract(state, `vain_${i % NUM_VAIN_CREATORS}`);
    }

    // Spammer runs every tick against the same post
    const spamResult = spammerInteract(state, spammerTarget.id);
    state.stats.spammerContributions.push(spamResult.contributionThisTick);

    // Age all posts
    tickTime(state);
  }

  // ── Results ────────────────────────────────────────────────────────────────
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, n) => s + n, 0) / arr.length;

  const fmtTime = (seconds: number) => {
    if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
    if (seconds >= 60)   return `${(seconds / 60).toFixed(1)}m`;
    return `${seconds.toFixed(0)}s`;
  };

  const totalPosts = state.posts.length;
  const stillAlive = state.posts.filter((p) => p.state === 'hidden').length;

  console.log('\n📊 RESULTS');
  console.log('─'.repeat(60));
  console.log(`Total posts created:      ${totalPosts}`);
  console.log(`Bloomed (revealed):       ${state.stats.bloomed} (${((state.stats.bloomed / totalPosts) * 100).toFixed(1)}%)`);
  console.log(`Expired (died):           ${state.stats.expired} (${((state.stats.expired / totalPosts) * 100).toFixed(1)}%)`);
  console.log(`Still alive (end):        ${stillAlive}`);
  console.log('');
  console.log(`Avg VIP lifetime:         ${fmtTime(avg(state.stats.vipLifetimeSeconds))}   (${state.stats.vipLifetimeSeconds.length} posts resolved)`);
  console.log(`Avg Pioneer lifetime:     ${fmtTime(avg(state.stats.pioneerLifetimeSeconds))}   (${state.stats.pioneerLifetimeSeconds.length} posts resolved)`);
  console.log('');
  console.log(`Total interactions:       bounce=${state.stats.bouncePenalties.toLocaleString()} | rewarded=${state.stats.rewards.toLocaleString()}`);
  console.log(`Economy — FUEL earned:    ${state.stats.totalFuelEarned.toFixed(2)}`);
  console.log(`Economy — FUEL bet:       ${state.stats.totalFuelBet.toFixed(2)}`);

  // ── Spammer anti-farming analysis ────────────────────────────────────────
  console.log('\n🤖 SPAMMER NEUTRALISATION TEST');
  console.log('─'.repeat(60));
  const intervals: Array<{ label: string; start: number; end: number }> = [
    { label: '0–15 s',    start: 0,  end: 15 },
    { label: '15–30 s',   start: 15, end: 30 },
    { label: '30–60 s',   start: 30, end: 60 },
    { label: '60–120 s',  start: 60, end: 120 },
    { label: '120–3600 s', start: 120, end: TOTAL_TICKS },
  ];

  for (const { label, start, end } of intervals) {
    const slice = state.stats.spammerContributions.slice(start, end);
    const totalContrib = slice.reduce((s, n) => s + n, 0);
    const avgContrib = slice.length > 0 ? totalContrib / slice.length : 0;
    const neutralised = avgContrib === 0 ? ' ✅ NEUTRALISED' : '';
    console.log(`  ${label.padEnd(14)} avg contribution/tick: ${avgContrib.toFixed(0)} ms${neutralised}`);
  }

  // ── Balance check ─────────────────────────────────────────────────────────
  console.log('\n⚖️  BALANCE ASSESSMENT');
  console.log('─'.repeat(60));

  const vipBloom = state.posts.filter((p) => p.authorTier === 'vip' && p.state === 'revealed').length;
  const pioneerBloom = state.posts.filter((p) => p.authorTier === 'pioneer' && p.state === 'revealed').length;
  const vipTotal = state.posts.filter((p) => p.authorTier === 'vip').length;
  const pioneerTotal = state.posts.filter((p) => p.authorTier === 'pioneer').length;

  console.log(`VIP bloom rate:     ${vipBloom}/${vipTotal} (${vipTotal > 0 ? ((vipBloom / vipTotal) * 100).toFixed(1) : 0}%)`);
  console.log(`Pioneer bloom rate: ${pioneerBloom}/${pioneerTotal} (${pioneerTotal > 0 ? ((pioneerBloom / pioneerTotal) * 100).toFixed(1) : 0}%)`);

  if (vipBloom > pioneerBloom * 2) {
    console.log('\n⚠️  WARNING: VIPs dominate blooms. Consider raising bounce penalty or lowering their base TTL.');
  } else if (pioneerBloom === 0) {
    console.log('\n⚠️  WARNING: No Pioneers are blooming. Lower the threshold or increase lurker reward duration.');
  } else {
    console.log('\n✅ Balance looks healthy — Pioneers have meaningful bloom opportunities.');
  }

  const bounceRatio = state.stats.bouncePenalties / (state.stats.bouncePenalties + state.stats.rewards);
  if (bounceRatio > 0.6) {
    console.log('⚠️  BOUNCE RATE HIGH (>60%). Raise REWARD_THRESHOLD or BOUNCE_PENALTY might need reducing.');
  } else {
    console.log(`✅ Bounce ratio: ${(bounceRatio * 100).toFixed(1)}% — within expected range.`);
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

runSimulation();
