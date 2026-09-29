// Run: node --test --test-force-exit src/lib/rateLimit.test.ts (set REDIS_URL to also test Redis)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from './rateLimit.ts';

test('allows up to maxRequests then blocks', async () => {
  const limiter = rateLimit('test-basic', { windowMs: 1000, maxRequests: 3 });
  const id = 'user-' + Math.random();

  assert.equal((await limiter(id)).allowed, true);
  assert.equal((await limiter(id)).allowed, true);
  assert.equal((await limiter(id)).allowed, true);
  const blocked = await limiter(id);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});

test('different limiter names on the same identifier do not share counts', async () => {
  const id = 'user-' + Math.random();
  const a = rateLimit('test-a', { windowMs: 1000, maxRequests: 1 });
  const b = rateLimit('test-b', { windowMs: 1000, maxRequests: 1 });

  assert.equal((await a(id)).allowed, true);
  assert.equal((await a(id)).allowed, false); // a's own limit hit
  assert.equal((await b(id)).allowed, true); // b unaffected by a
});

test('resets after the window passes', async () => {
  const limiter = rateLimit('test-reset', { windowMs: 50, maxRequests: 1 });
  const id = 'user-' + Math.random();

  assert.equal((await limiter(id)).allowed, true);
  assert.equal((await limiter(id)).allowed, false);
  await new Promise((r) => setTimeout(r, 80));
  assert.equal((await limiter(id)).allowed, true);
});
