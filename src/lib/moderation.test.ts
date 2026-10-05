// Run: node --test --test-force-exit src/lib/moderation.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { setUserRelation, removeUserRelation, submitReport } from './moderation.ts';

function withFakeInsert(t: import('node:test').TestContext, rows: unknown[]) {
  return t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      rows.push(v);
      return { onConflictDoNothing: async () => {} };
    },
  }) as never);
}

const resolvesTo = (userId: string | null) => async () => userId;

test('setUserRelation resolves the target and saves a block/mute', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner-1' } }) as never);
  const inserted: unknown[] = [];
  withFakeInsert(t, inserted);

  const result = await setUserRelation(new Headers(), 'ROOM01', 'player-b', 'Bob', 'mute', resolvesTo('target-1'));
  assert.equal(result.success, true);
  assert.deepEqual(inserted, [
    { id: 'owner-1:target-1:mute', ownerUserId: 'owner-1', targetUserId: 'target-1', type: 'mute', targetName: 'Bob' },
  ]);
});

test('setUserRelation refuses when the target was never linked to a user', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner-1' } }) as never);
  const insertMock = t.mock.method(db, 'insert', () => {
    throw new Error('should not be called');
  });

  const result = await setUserRelation(new Headers(), 'ROOM01', 'player-b', 'Bob', 'block', resolvesTo(null));
  assert.equal(result.success, false);
  assert.equal(insertMock.mock.callCount(), 0);
});

test('setUserRelation refuses self-block', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner-1' } }) as never);

  const result = await setUserRelation(new Headers(), 'ROOM01', 'player-a', 'Me', 'block', resolvesTo('owner-1'));
  assert.equal(result.success, false);
  assert.match(result.error!, /yourself/i);
});

test('setUserRelation requires a signed-in user', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => null as never);

  const result = await setUserRelation(new Headers(), 'ROOM01', 'player-b', 'Bob', 'mute', resolvesTo('target-1'));
  assert.equal(result.success, false);
  assert.match(result.error!, /sign-in/i);
});

test('removeUserRelation deletes by the deterministic relation id', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'owner-1' } }) as never);
  const wheres: unknown[] = [];
  t.mock.method(db, 'delete', () => ({
    where: (w: unknown) => {
      wheres.push(w);
      return Promise.resolve();
    },
  }) as never);

  const result = await removeUserRelation(new Headers(), 'target-1', 'mute');
  assert.equal(result.success, true);
  assert.equal(wheres.length, 1);
});

test('submitReport resolves both sides best-effort and saves the report', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'reporter-1' } }) as never);
  const inserted: unknown[] = [];
  withFakeInsert(t, inserted);

  const result = await submitReport(new Headers(), 'ROOM01', 'player-b', 'Bob', 'spamming drawings', resolvesTo('reported-1'));
  assert.equal(result.success, true);
  assert.equal(inserted.length, 1);
  assert.equal((inserted[0] as { reportedName: string }).reportedName, 'Bob');
  assert.equal((inserted[0] as { reportedUserId: string }).reportedUserId, 'reported-1');
});

test('submitReport still saves the report when the target was never linked to a user', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'reporter-1' } }) as never);
  const inserted: unknown[] = [];
  withFakeInsert(t, inserted);

  const result = await submitReport(new Headers(), 'ROOM01', 'player-b', 'Bob', 'reason', resolvesTo(null));
  assert.equal(result.success, true);
  assert.equal((inserted[0] as { reportedUserId: string | null }).reportedUserId, null);
});

test('all moderation actions no-op/fail without DATABASE_URL configured', async () => {
  delete process.env.DATABASE_URL;

  assert.equal((await setUserRelation(new Headers(), 'ROOM01', 'player-b', 'Bob', 'mute')).success, false);
  assert.equal((await removeUserRelation(new Headers(), 'target-1', 'mute')).success, false);
  assert.equal((await submitReport(new Headers(), 'ROOM01', 'player-b', 'Bob', 'reason')).success, false);
});
