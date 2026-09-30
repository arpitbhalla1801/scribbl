// Run: node --test --test-force-exit src/lib/playerLink.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { attachPlayerToUser } from './playerLink.ts';

test('links the playerId to the signed-in user when a session exists', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);

  const inserted: unknown[] = [];
  t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      inserted.push(v);
      return { onConflictDoNothing: async () => {} };
    },
  }) as never);

  await attachPlayerToUser(new Headers(), 'ROOM01', 'player-a');
  assert.deepEqual(inserted, [{ playerId: 'player-a', roomId: 'ROOM01', userId: 'user-1' }]);
});

test('does nothing when there is no session', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => null as never);
  const insertMock = t.mock.method(db, 'insert', () => {
    throw new Error('should not be called');
  });

  await attachPlayerToUser(new Headers(), 'ROOM01', 'player-b');
  assert.equal(insertMock.mock.callCount(), 0);
});

test('swallows errors from a broken session lookup', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => {
    throw new Error('boom');
  });

  await assert.doesNotReject(attachPlayerToUser(new Headers(), 'ROOM01', 'player-c'));
});

test('no-ops without DATABASE_URL configured', async (t) => {
  delete process.env.DATABASE_URL;
  const insertMock = t.mock.method(db, 'insert', () => {
    throw new Error('should not be called');
  });

  await attachPlayerToUser(new Headers(), 'ROOM01', 'player-d');
  assert.equal(insertMock.mock.callCount(), 0);
});
