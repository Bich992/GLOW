/**
 * Posts API tests
 */

describe('Posts API', () => {
  const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

  it('GET /api/posts should return posts array', async () => {
    const res = await fetch(`${BASE_URL}/api/posts`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data.posts)).toBe(true);
    expect(data).toHaveProperty('nextCursor');
  });

  it('GET /api/posts should support limit parameter', async () => {
    const res = await fetch(`${BASE_URL}/api/posts?limit=5`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.posts.length).toBeLessThanOrEqual(5);
  });

  it('GET /api/posts should support filter=all', async () => {
    const res = await fetch(`${BASE_URL}/api/posts?filter=all`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.posts)).toBe(true);
  });

  it('GET /api/posts/[id] should return 404 for invalid id', async () => {
    const res = await fetch(`${BASE_URL}/api/posts/nonexistent_id`);
    expect(res.status).toBe(404);
  });

  it('POST /api/posts should require authentication (not 402 — publishing is free)', async () => {
    const res = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test post', imageUrl: 'https://example.com/img.jpg' }),
    });
    // Without auth, should be 401 (not 402 — publishing is free)
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(402);
  });

  it('posts in feed should have required fields', async () => {
    const res = await fetch(`${BASE_URL}/api/posts`);
    const data = await res.json();

    if (data.posts.length > 0) {
      const post = data.posts[0];
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('author');
      expect(post.author).toHaveProperty('username');
      expect(post.author).toHaveProperty('displayName');
      expect(post).toHaveProperty('status');
      expect(post).toHaveProperty('expiresAt');
    }
  });
});
