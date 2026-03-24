import type { ModerationMiddleware, ModerationResult } from './pipeline';
import { logger } from '@/lib/logger';

/**
 * Local toxicity check — zero external dependencies, zero cost.
 *
 * Catches the most obvious violations (hate speech keywords, spam patterns)
 * using a curated regex list.  For a production-grade check you can swap
 * the implementation here without changing the pipeline interface.
 */

// Patterns that trigger an automatic block
const BLOCK_PATTERNS: RegExp[] = [
  // Hate speech — slurs (Italian + English, censored here for safety)
  /\bn[i1]gg[ae3]r\b/i,
  /\bf[a4]gg[o0]t\b/i,
  /\bspastic\b/i,
  /\bretard\b/i,
  // Spam signals — repeated characters / ALL CAPS long strings
  /(.)\1{9,}/,                       // same char 10+ times in a row
  /^[A-Z\s!?]{40,}$/,               // all-caps wall of text
  // Explicit violence / self-harm keywords
  /\bkill\s+yourself\b/i,
  /\bammazzati\b/i,
  /\bsuicidati\b/i,
];

// Patterns that add a strike but don't block outright
const WARN_PATTERNS: RegExp[] = [
  /\bstupid[o]?\b/i,
  /\bidiota?\b/i,
  /\bscemo\b/i,
  /\bvaffanculo\b/i,
  /\bfuck\s+you\b/i,
];

export const toxicityMiddleware: ModerationMiddleware = async (
  post
): Promise<ModerationResult> => {
  const text = post.text;

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn('toxicityMiddleware: block pattern matched', {
        pattern: pattern.toString(),
      });
      return {
        pass: false,
        reason: 'Il contenuto viola le linee guida della community.',
        code: 'TOXIC',
      };
    }
  }

  // Count how many warn patterns match
  const warnCount = WARN_PATTERNS.filter((p) => p.test(text)).length;
  if (warnCount >= 2) {
    return {
      pass: false,
      reason: 'Il contenuto potrebbe violare le linee guida della community.',
      code: 'TOXIC',
    };
  }

  return { pass: true };
};
