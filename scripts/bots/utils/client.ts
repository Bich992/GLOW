import { throttle } from './rate-limiter';

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  latencyMs: number;
}

export type BotSession = {
  botId: string;
  sessionCookie: string;
};

const BASE_URL = process.env.BOT_BASE_URL ?? 'http://localhost:3000';

export async function apiCall<T = unknown>(
  session: BotSession,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  await throttle(session.botId);

  const start = Date.now();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `timely_session=${session.sessionCookie}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const latencyMs = Date.now() - start;
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }

  return { data, status: res.status, latencyMs };
}
