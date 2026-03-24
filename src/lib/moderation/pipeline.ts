/**
 * Pre-publication moderation pipeline.
 * Runs a composable chain of middleware before each post insert.
 */

export interface PostDraft {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

export interface UserContext {
  id: string;
  glow_trust: number;
  trust_strikes: number;
}

export type ModerationCode = 'TOXIC' | 'SPAM' | 'TRUST_BLOCKED';

export type ModerationResult =
  | { pass: true }
  | { pass: false; reason: string; code: ModerationCode };

export type ModerationMiddleware = (
  post: PostDraft,
  user: UserContext
) => Promise<ModerationResult>;

/**
 * Runs `middlewares` in order. Stops and returns the first failure.
 */
export async function runModerationPipeline(
  post: PostDraft,
  user: UserContext,
  middlewares: ModerationMiddleware[]
): Promise<ModerationResult> {
  for (const mw of middlewares) {
    const result = await mw(post, user);
    if (!result.pass) return result;
  }
  return { pass: true };
}
