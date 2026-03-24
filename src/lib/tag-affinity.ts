/**
 * Tag affinity utilities.
 *
 * A user's tag vector is stored on User.tag_vector as a JSON object: { [tag]: count }
 * Cosine similarity between a post's tags and the user's vector drives the For You feed.
 */

export type TagVector = Record<string, number>;

/** Extract hashtags from post content. */
export function extractTags(content: string): string[] {
  const matches = content.match(/#\w+/g);
  return matches ? Array.from(new Set(matches.map((t) => t.toLowerCase()))) : [];
}

/**
 * Returns the cosine similarity [0, 1] between post tags and a user's tag vector.
 * Returns 0 if either side is empty.
 */
export function cosineSimilarity(postTags: string[], userVector: TagVector): number {
  if (postTags.length === 0) return 0;

  const vectorKeys = Object.keys(userVector);
  if (vectorKeys.length === 0) return 0;

  // Dot product: sum of userVector[tag] for matching tags
  const dot = postTags.reduce((sum, tag) => sum + (userVector[tag] ?? 0), 0);
  if (dot === 0) return 0;

  // Post vector magnitude: each tag has weight 1
  const postMag = Math.sqrt(postTags.length);

  // User vector magnitude
  const userMag = Math.sqrt(vectorKeys.reduce((sum, k) => sum + (userVector[k] ** 2), 0));
  if (userMag === 0) return 0;

  return dot / (postMag * userMag);
}

/**
 * Increments counts in a tag vector for the given tags.
 * Returns the updated vector (immutable).
 */
export function incrementTagVector(vector: TagVector, tags: string[]): TagVector {
  const updated = { ...vector };
  for (const tag of tags) {
    updated[tag] = (updated[tag] ?? 0) + 1;
  }
  return updated;
}
