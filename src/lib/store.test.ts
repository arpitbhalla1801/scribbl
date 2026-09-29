// Run: node --test --test-force-exit src/lib/store.test.ts  (set REDIS_URL to also test Redis)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryStore, RedisStore } from './store.ts';
import type { GameStore } from './store.ts';
import type { GameState } from './types.ts';

const stores: [string, GameStore][] = [['memory', new InMemoryStore()]];
if (process.env.REDIS_URL) stores.push(['redis', new RedisStore(process.env.REDIS_URL)]);

const room = (roomId: string) =>
  ({ roomId, currentTurn: 0, players: [], settings: { rounds: 2, timePerRound: 60 } }) as unknown as GameState;

for (const [name, store] of stores) {
  test(`${name}: create is exclusive, missing room returns null`, async () => {
    assert.equal(await store.create(room('T1' + name)), true);
    assert.equal(await store.create(room('T1' + name)), false);
    assert.equal(await store.atomicUpdate('NOPE' + name, () => 1), null);
    await store.delete('T1' + name);
  });

  test(`${name}: simultaneous updates lose nothing`, async () => {
    const id = 'T2' + name;
    await store.create(room(id));
    await Promise.all(Array.from({ length: 50 }, () => store.atomicUpdate(id, (g) => void g.currentTurn++)));
    assert.equal((await store.get(id))!.currentTurn, 50);
    await store.delete(id);
  });
}
