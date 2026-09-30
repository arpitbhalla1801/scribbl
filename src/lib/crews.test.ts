// Run: node --test --test-force-exit src/lib/crews.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { crewMembers, crews } from './db/schema.ts';
import { heartbeat } from './presence.ts';
import {
  acceptInvite,
  addCrewMember,
  cancelInvite,
  createCrew,
  createInvite,
  getInvite,
  leaveCrew,
  listCrewMembers,
  listMyCrews,
  MAX_CREW_MEMBERS,
} from './crews.ts';

// Chain that resolves to `rows` regardless of how many .from()/.innerJoin()/
// .where()/.limit() calls come before the final await - simplest way to
// stub drizzle's fluent query builder without reimplementing its shape.
function fakeSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
    then: (resolve: (v: unknown[]) => void) => resolve(rows),
  };
  return () => chain;
}

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

test('createInvite requires the caller to already be a crew member', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  t.mock.method(db, 'select', fakeSelectChain([]) as never); // isCrewMember finds nothing

  const result = await createInvite(new Headers(), 'crew-1');
  assert.equal(result.success, false);
  assert.match(result.error!, /not a member/i);
});

test('createInvite generates a code and saves it once membership is confirmed', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  t.mock.method(db, 'select', fakeSelectChain([{ id: 'crew-1:user-1' }]) as never);
  const inserted: unknown[] = [];
  t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      inserted.push(v);
      return Promise.resolve();
    },
  }) as never);

  const result = await createInvite(new Headers(), 'crew-1');
  assert.equal(result.success, true);
  assert.equal(result.code!.length, 8);
  assert.equal((inserted[0] as { crewId: string }).crewId, 'crew-1');
  assert.equal((inserted[0] as { status?: string }).status, undefined); // defaults to 'pending' in the DB
});

test('getInvite returns the joined crew name, or null if the code is unknown', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(db, 'select', fakeSelectChain([{ crewId: 'crew-1', crewName: 'The Sketchers', status: 'pending' }]) as never);
  assert.deepEqual(await getInvite('ABC123XY'), { crewId: 'crew-1', crewName: 'The Sketchers', status: 'pending' });

  t.mock.method(db, 'select', fakeSelectChain([]) as never);
  assert.equal(await getInvite('NOTFOUND'), null);
});

test('acceptInvite rejects an invite that is not pending', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-2' } }) as never);
  t.mock.method(db, 'select', fakeSelectChain([{ id: 'invite-1', crewId: 'crew-1', status: 'cancelled' }]) as never);

  const result = await acceptInvite(new Headers(), 'ABC123XY');
  assert.equal(result.success, false);
  assert.match(result.error!, /no longer valid/i);
});

test('acceptInvite adds the caller to the crew and marks the invite accepted', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-2' } }) as never);
  // First select: the invite lookup. Second (inside addCrewMember): existing
  // members, empty so the add succeeds. Same fake chain serves both since
  // an empty crewInvites row and an empty crewMembers row look the same to
  // this stub - the invite lookup only needs one row back, which the
  // no-membership case coincidentally also returns zero of. To keep the
  // invite lookup returning a row, use call count to switch response.
  let call = 0;
  t.mock.method(db, 'select', (() => {
    call++;
    return call === 1
      ? fakeSelectChain([{ id: 'invite-1', crewId: 'crew-1', status: 'pending' }])()
      : fakeSelectChain([])();
  }) as never);
  const inserted: unknown[] = [];
  t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      inserted.push(v);
      return Promise.resolve();
    },
  }) as never);
  const updated: unknown[] = [];
  t.mock.method(db, 'update', () => ({
    set: (v: unknown) => {
      updated.push(v);
      return { where: async () => {} };
    },
  }) as never);

  const result = await acceptInvite(new Headers(), 'ABC123XY');
  assert.equal(result.success, true);
  assert.equal(result.crewId, 'crew-1');
  assert.equal(inserted.length, 1); // addCrewMember's insert
  assert.equal((updated[0] as { status: string }).status, 'accepted');
  assert.equal((updated[0] as { acceptedByUserId: string }).acceptedByUserId, 'user-2');
});

test('cancelInvite requires the caller to be a crew member', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-3' } }) as never);
  let call = 0;
  t.mock.method(db, 'select', (() => {
    call++;
    return call === 1
      ? fakeSelectChain([{ id: 'invite-1', crewId: 'crew-1', status: 'pending' }])()
      : fakeSelectChain([])(); // isCrewMember: not a member
  }) as never);

  const result = await cancelInvite(new Headers(), 'ABC123XY');
  assert.equal(result.success, false);
  assert.match(result.error!, /not a member/i);
});

test('listCrewMembers reports which members are currently online, gated on the caller being one', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  await heartbeat('user-1');
  const rows = [
    { userId: 'user-1', name: 'Alice', role: 'host' },
    { userId: 'user-2', name: 'Bob', role: 'player' },
  ];
  t.mock.method(db, 'select', fakeSelectChain(rows) as never);

  const result = await listCrewMembers(new Headers(), 'crew-1');
  assert.equal(result.success, true);
  assert.deepEqual(result.members, [
    { userId: 'user-1', name: 'Alice', role: 'host', online: true },
    { userId: 'user-2', name: 'Bob', role: 'player', online: false },
  ]);
});

test('listCrewMembers refuses a caller who is not in the crew', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'outsider' } }) as never);
  t.mock.method(db, 'select', fakeSelectChain([{ userId: 'user-1', name: 'Alice', role: 'host' }]) as never);

  const result = await listCrewMembers(new Headers(), 'crew-1');
  assert.equal(result.success, false);
  assert.match(result.error!, /not a member/i);
});
