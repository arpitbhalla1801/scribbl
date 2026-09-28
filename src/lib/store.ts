import Redis from 'ioredis';
import type { GameState } from './types';

// Rooms expire after 3h without a write.
const TTL_SECONDS = 3 * 60 * 60;
const MAX_RETRIES = 20;

export interface GameStore {
  get(roomId: string): Promise<GameState | null>;
  // false if the room already exists
  create(game: GameState): Promise<boolean>;
  delete(roomId: string): Promise<void>;
  // Runs mutate on the current state and saves it. mutate must be sync and
  // free of side effects: the Redis store re-runs it on a write conflict.
  // Returns null if the room doesn't exist.
  atomicUpdate<T>(roomId: string, mutate: (game: GameState) => T): Promise<T | null>;
}

export class InMemoryStore implements GameStore {
  private rooms = new Map<string, { game: GameState; expiresAt: number }>();

  private live(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room && room.expiresAt < Date.now()) {
      this.rooms.delete(roomId);
      return undefined;
    }
    return room;
  }

  async get(roomId: string) {
    const room = this.live(roomId);
    return room ? structuredClone(room.game) : null;
  }

  async create(game: GameState) {
    if (this.live(game.roomId)) return false;
    this.rooms.set(game.roomId, { game: structuredClone(game), expiresAt: Date.now() + TTL_SECONDS * 1000 });
    return true;
  }

  async delete(roomId: string) {
    this.rooms.delete(roomId);
  }

  // No await between read and write, so this can't interleave.
  async atomicUpdate<T>(roomId: string, mutate: (game: GameState) => T) {
    const room = this.live(roomId);
    if (!room) return null;
    const copy = structuredClone(room.game);
    const out = mutate(copy);
    room.game = copy;
    room.expiresAt = Date.now() + TTL_SECONDS * 1000;
    return out;
  }
}

// Room is a hash: `state` (JSON) and `version` (bumped on every write).
export class RedisStore implements GameStore {
  private client: Redis;
  private idle: Redis[] = [];

  constructor(url: string) {
    this.client = new Redis(url);
  }

  private key(roomId: string) {
    return `room:${roomId}`;
  }

  async get(roomId: string) {
    const state = await this.client.hget(this.key(roomId), 'state');
    return state ? (JSON.parse(state) as GameState) : null;
  }

  async create(game: GameState) {
    const key = this.key(game.roomId);
    if (!(await this.client.hsetnx(key, 'state', JSON.stringify(game)))) return false;
    await this.client.multi().hset(key, 'version', 0).expire(key, TTL_SECONDS).exec();
    return true;
  }

  async delete(roomId: string) {
    await this.client.del(this.key(roomId));
  }

  // WATCH is per connection, so each update borrows its own connection.
  async atomicUpdate<T>(roomId: string, mutate: (game: GameState) => T) {
    const key = this.key(roomId);
    const conn = this.idle.pop() ?? this.client.duplicate();
    try {
      for (let i = 0; i < MAX_RETRIES; i++) {
        await conn.watch(key);
        const state = await conn.hget(key, 'state');
        if (!state) {
          await conn.unwatch();
          this.idle.push(conn);
          return null;
        }
        const game = JSON.parse(state) as GameState;
        const out = mutate(game);
        const done = await conn
          .multi()
          .hset(key, 'state', JSON.stringify(game))
          .hincrby(key, 'version', 1)
          .expire(key, TTL_SECONDS)
          .exec();
        if (!done) {
          await new Promise((r) => setTimeout(r, Math.random() * 10 * (i + 1))); // back off on conflict
          continue;
        }
        this.idle.push(conn);
        return out;
      }
      throw new Error(`atomicUpdate: too many conflicts on ${roomId}`);
    } catch (err) {
      conn.disconnect(); // may still be watching, don't reuse
      throw err;
    }
  }
}

export function createStore(): GameStore {
  const url = process.env.REDIS_URL;
  if (url) return new RedisStore(url);
  if (process.env.NODE_ENV === 'production') throw new Error('REDIS_URL is required in production');
  return new InMemoryStore();
}
