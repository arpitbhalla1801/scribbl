// Run: node --test --test-force-exit src/lib/events.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from './db.ts';
import { recordGameJoinEvent } from './events.ts';

function fakeSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
    then: (resolve: (v: unknown[]) => void) => resolve(rows),
  };
  return () => chain;
}

// First db.select call is the prior-visit (D7 return) check against
// `events`; the second is hasAnyCrew's membership check against
// `crewMembers`. Dispatching by call order keeps this test independent of
// drizzle's exact query-builder shape.
function fakeSelectSequence(t: import('node:test').TestContext, responses: unknown[][]) {
  let call = 0;
  t.mock.method(db, 'select', (() => {
    const rows = responses[Math.min(call, responses.length - 1)];
    call++;
    return fakeSelectChain(rows)();
  }) as never);
}

test('no-ops without DATABASE_URL configured', async () => {
  delete process.env.DATABASE_URL;
  const result = await recordGameJoinEvent('user-1', 'ROOM01');
  assert.equal(result, undefined); // just confirms it doesn't throw
});

test('no-ops when there is no resolved user', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  await assert.doesNotReject(recordGameJoinEvent(null, 'ROOM01'));
});

test('first visit is not a return, hasCrew reflects membership', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  fakeSelectSequence(t, [[], [{ id: 'crew-1:user-1' }]]); // no prior events, but in a crew
  const inserted: unknown[] = [];
  t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      inserted.push(v);
      return Promise.resolve();
    },
  }) as never);

  await recordGameJoinEvent('user-1', 'ROOM01');
  assert.equal(inserted.length, 1);
  const metadata = (inserted[0] as { metadata: { isReturn: boolean; hasCrew: boolean; roomId: string } }).metadata;
  assert.deepEqual(metadata, { roomId: 'ROOM01', isReturn: false, hasCrew: true });
});

test('a prior game_joined event within 7 days marks this one as a return', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  fakeSelectSequence(t, [[{ id: 'event-0' }], []]); // prior event exists, no crew
  const inserted: unknown[] = [];
  t.mock.method(db, 'insert', () => ({
    values: (v: unknown) => {
      inserted.push(v);
      return Promise.resolve();
    },
  }) as never);

  await recordGameJoinEvent('user-1', 'ROOM02');
  const metadata = (inserted[0] as { metadata: { isReturn: boolean; hasCrew: boolean } }).metadata;
  assert.equal(metadata.isReturn, true);
  assert.equal(metadata.hasCrew, false);
});

test('swallows a lookup failure rather than blocking the join', async (t) => {
  process.env.DATABASE_URL = 'postgres://test';
  t.mock.method(db, 'select', () => {
    throw new Error('boom');
  });

  await assert.doesNotReject(recordGameJoinEvent('user-1', 'ROOM01'));
});
