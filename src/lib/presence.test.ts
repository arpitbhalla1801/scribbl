// Run: node --test --test-force-exit src/lib/presence.test.ts
// No REDIS_URL in the test env, so this exercises the in-memory fallback
// path (same pattern as rateLimit.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOnlineUserIds, heartbeat } from './presence.ts';

test('a user is online right after a heartbeat', async () => {
  await heartbeat('user-1');
  const online = await getOnlineUserIds(['user-1', 'user-2']);
  assert.equal(online.has('user-1'), true);
  assert.equal(online.has('user-2'), false);
});

test('getOnlineUserIds with no ids returns an empty set without querying', async () => {
  const online = await getOnlineUserIds([]);
  assert.deepEqual(online, new Set());
});
