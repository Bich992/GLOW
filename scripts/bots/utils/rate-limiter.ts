/** Minimum ms between API calls per bot to avoid server-side rate limits. */
const MIN_DELAY_MS = 2_000;

const lastCallTime = new Map<string, number>();

export async function throttle(botId: string): Promise<void> {
  const last = lastCallTime.get(botId) ?? 0;
  const now = Date.now();
  const elapsed = now - last;

  if (elapsed < MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed));
  }

  lastCallTime.set(botId, Date.now());
}
