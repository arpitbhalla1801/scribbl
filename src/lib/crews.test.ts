// Run: node --test --test-force-exit src/lib/crews.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { crewMembers, crews } from './db/schema.ts';
import { addCrewMember, createCrew, leaveCrew, listMyCrews, MAX_CREW_MEMBERS } from './crews.ts';

function fakeSelectFromWhere(rows: unknown[]) {
  return () => ({ from: () => ({ where: async () => rows }) });
}

test('createCrew makes the crew and adds the creator as host', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  const inserted: unknown[] = [];
  t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      inserted.push(v);
      return Promise.resolve();
    },
  }) as never);

  const result = await createCrew(new Headers(), 'The Sketchers');
  assert.equal(result.success, true);
  assert.equal(result.crew!.name, 'The Sketchers');
  assert.equal(inserted.length, 2);
  assert.equal((inserted[0] as { name: string }).name, 'The Sketchers');
  assert.equal((inserted[1] as { role: string }).role, 'host');
  assert.equal((inserted[1] as { userId: string }).userId, 'user-1');
});

test('createCrew requires a signed-in user', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => null as never);

  const result = await createCrew(new Headers(), 'The Sketchers');
  assert.equal(result.success, false);
  assert.match(result.error!, /sign-in/i);
});

test('listMyCrews returns the joined crew + role rows', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  const rows = [{ id: 'crew-1', name: 'The Sketchers', role: 'host' }];
  t.mock.method(db, 'select', () => ({
    from: () => ({ innerJoin: () => ({ where: async () => rows }) }),
  }) as never);

  const result = await listMyCrews(new Headers());
  assert.deepEqual(result, rows);
});

test('listMyCrews returns empty without a session', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => null as never);

  const result = await listMyCrews(new Headers());
  assert.deepEqual(result, []);
});

test('leaveCrew removes the membership and deletes an emptied crew', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  const deletedTables: unknown[] = [];
  t.mock.method(db, 'delete', (table: unknown) => {
    deletedTables.push(table);
    return { where: async () => {} };
  });
  t.mock.method(db, 'select', fakeSelectFromWhere([]) as never); // no members left

  const result = await leaveCrew(new Headers(), 'crew-1');
  assert.equal(result.success, true);
  assert.deepEqual(deletedTables, [crewMembers, crews]);
});

test('leaveCrew keeps the crew around when other members remain', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  const deletedTables: unknown[] = [];
  t.mock.method(db, 'delete', (table: unknown) => {
    deletedTables.push(table);
    return { where: async () => {} };
  });
  t.mock.method(db, 'select', fakeSelectFromWhere([{ id: 'crew-1:user-2' }]) as never);

  const result = await leaveCrew(new Headers(), 'crew-1');
  assert.equal(result.success, true);
  assert.deepEqual(deletedTables, [crewMembers]);
});

test('addCrewMember rejects a duplicate membership', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(db, 'select', fakeSelectFromWhere([{ id: 'crew-1:user-2' }]) as never);
  const insertMock = t.mock.method(db, 'insert', () => {
    throw new Error('should not be called');
  });

  const result = await addCrewMember('crew-1', 'user-2');
  assert.equal(result.success, false);
  assert.match(result.error!, /already/i);
  assert.equal(insertMock.mock.callCount(), 0);
});

test('addCrewMember rejects once the soft cap is reached', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  const fullCrew = Array.from({ length: MAX_CREW_MEMBERS }, (_, i) => ({ id: `crew-1:user-${i}` }));
  t.mock.method(db, 'select', fakeSelectFromWhere(fullCrew) as never);
  const insertMock = t.mock.method(db, 'insert', () => {
    throw new Error('should not be called');
  });

  const result = await addCrewMember('crew-1', 'user-new');
  assert.equal(result.success, false);
  assert.match(result.error!, /full/i);
  assert.equal(insertMock.mock.callCount(), 0);
});

test('addCrewMember succeeds under the cap with no existing membership', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(db, 'select', fakeSelectFromWhere([]) as never);
  const inserted: unknown[] = [];
  t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      inserted.push(v);
      return Promise.resolve();
    },
  }) as never);

  const result = await addCrewMember('crew-1', 'user-2', 'player');
  assert.equal(result.success, true);
  assert.equal(inserted.length, 1);
  assert.equal((inserted[0] as { id: string }).id, 'crew-1:user-2');
});

test('all crew actions no-op/fail without DATABASE_URL configured', async () => {
  delete process.env.DATABASE_URL;

  assert.equal((await createCrew(new Headers(), 'Name')).success, false);
  assert.deepEqual(await listMyCrews(new Headers()), []);
  assert.equal((await leaveCrew(new Headers(), 'crew-1')).success, false);
});
