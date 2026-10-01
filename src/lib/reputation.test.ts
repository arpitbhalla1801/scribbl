// Run: node --test --test-force-exit src/lib/reputation.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { getMyReputation, getReputation } from './reputation.ts';

function fakeSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
    then: (resolve: (v: unknown[]) => void) => resolve(rows),
  };
  return () => chain;
}

// db.select is called three times (kicked, reported, blocked) via
// Promise.all - order isn't guaranteed, so dispatch by row shape isn't
// reliable either. Instead, return the same fixed set of rows-per-call
// using call order, which Promise.all still issues synchronously in the
// order the array was built.
function fakeSelectSequence(t: import('node:test').TestContext, responses: unknown[][]) {
  let call = 0;
  t.mock.method(db, 'select', (() => {
    const rows = responses[Math.min(call, responses.length - 1)];
    call++;
    return fakeSelectChain(rows)();
  }) as never);
}

test('getReputation counts kicks, reports, and blocks into a flag total', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  fakeSelectSequence(t, [
    [{ id: 'event-1' }, { id: 'event-2' }], // 2 vote_kicked events
    [{ id: 'report-1' }], // 1 report
    [], // 0 blocks
  ]);

  const reputation = await getReputation('user-1');
  assert.deepEqual(reputation, { timesKicked: 2, timesReported: 1, timesBlocked: 0, flagCount: 3 });
});

test('getReputation returns all zeros without DATABASE_URL configured', async () => {
  delete process.env.DATABASE_URL;
  assert.deepEqual(await getReputation('user-1'), { timesKicked: 0, timesReported: 0, timesBlocked: 0, flagCount: 0 });
});

test('getReputation swallows a lookup failure as all zeros', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(db, 'select', () => {
    throw new Error('boom');
  });

  assert.deepEqual(await getReputation('user-1'), { timesKicked: 0, timesReported: 0, timesBlocked: 0, flagCount: 0 });
});

test('getMyReputation requires a signed-in user', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => null as never);

  const result = await getMyReputation(new Headers());
  assert.equal(result.success, false);
  assert.match(result.error!, /sign-in/i);
});

test('getMyReputation returns the caller’s own reputation', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(auth.api, 'getSession', async () => ({ user: { id: 'user-1' } }) as never);
  fakeSelectSequence(t, [[], [], []]);

  const result = await getMyReputation(new Headers());
  assert.equal(result.success, true);
  assert.deepEqual(result.reputation, { timesKicked: 0, timesReported: 0, timesBlocked: 0, flagCount: 0 });
});
