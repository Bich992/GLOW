/**
 * API health endpoint tests
 */

describe('Health API', () => {
  const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

  it('should return 200 with status ok', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.services).toBeDefined();
    expect(data.services.database).toBeDefined();
  });

  it('should include latency information', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    expect(typeof data.latencyMs).toBe('number');
    expect(data.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should return environment field', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    expect(['development', 'test', 'production']).toContain(data.environment);
  });
});
