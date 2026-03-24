/**
 * Redis client — Upstash REST API when configured, in-process Map otherwise.
 *
 * The in-process fallback works per-serverless-instance (no shared state
 * across Vercel functions), but is sufficient for development and for
 * soft caching like the For You feed ranked list.
 *
 * To enable Upstash: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 * Without them, everything still works — just without cross-instance sharing.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ── In-process fallback ───────────────────────────────────────────────────────
interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
}

const localCache = new Map<string, CacheEntry>();
const localSets = new Map<string, Set<string>>();

function localGet<T>(key: string): T | null {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    localCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function localSet(key: string, value: unknown, exSeconds?: number): void {
  localCache.set(key, {
    value,
    expiresAt: exSeconds ? Date.now() + exSeconds * 1000 : null,
  });
}

// ── Upstash REST helper ───────────────────────────────────────────────────────
interface UpstashResponse<T> {
  result: T;
}

async function upstashRequest<T>(command: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(REDIS_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as UpstashResponse<T>;
    return data.result;
  } catch {
    return null;
  }
}

// ── Public interface ──────────────────────────────────────────────────────────
const useUpstash = !!(REDIS_URL && REDIS_TOKEN);

export const redis = {
  get: async <T>(key: string): Promise<T | null> => {
    if (!useUpstash) return localGet<T>(key);

    const result = await upstashRequest<string>(['GET', key]);
    if (result === null) return null;
    try { return JSON.parse(result) as T; } catch { return result as unknown as T; }
  },

  set: async (key: string, value: unknown, exSeconds?: number): Promise<void> => {
    if (!useUpstash) { localSet(key, value, exSeconds); return; }

    const serialised = JSON.stringify(value);
    if (exSeconds !== undefined) {
      await upstashRequest(['SET', key, serialised, 'EX', exSeconds]);
    } else {
      await upstashRequest(['SET', key, serialised]);
    }
  },

  del: async (key: string): Promise<void> => {
    if (!useUpstash) { localCache.delete(key); return; }
    await upstashRequest(['DEL', key]);
  },

  setAdd: async (key: string, member: string, exSeconds?: number): Promise<void> => {
    if (!useUpstash) {
      if (!localSets.has(key)) localSets.set(key, new Set());
      localSets.get(key)!.add(member);
      if (exSeconds) setTimeout(() => localSets.get(key)?.delete(member), exSeconds * 1000);
      return;
    }
    await upstashRequest(['SADD', key, member]);
    if (exSeconds !== undefined) await upstashRequest(['EXPIRE', key, exSeconds]);
  },

  setIsMember: async (key: string, member: string): Promise<boolean> => {
    if (!useUpstash) return localSets.get(key)?.has(member) ?? false;

    const result = await upstashRequest<number>(['SISMEMBER', key, member]);
    return result === 1;
  },
};
