import Redis from 'ioredis';

// #44: cross-room "is this user around right now" presence, separate from
// the per-game-room Player.lastSeenAt heartbeat in gameManager.ts (that one
// only exists while a specific game room is live). Same Redis instance and
// same falls-back-to-memory-in-dev pattern as rateLimit.ts.
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : undefined;
const memoryPresence = new Map<string, number>(); // userId -> last heartbeat ms

// A bit more than 2x the client's expected heartbeat interval, so one
// missed beat (a slow request, a brief network hiccup) doesn't flip someone
// to "offline" and back.
const PRESENCE_TTL_SECONDS = 45;

function key(userId: string): string {
  return `presence:${userId}`;
}

export async function heartbeat(userId: string): Promise<void> {
  if (redis) {
    await redis.set(key(userId), Date.now(), 'EX', PRESENCE_TTL_SECONDS);
  } else {
    memoryPresence.set(userId, Date.now());
  }
}

export async function getOnlineUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  if (redis) {
    const values = await redis.mget(userIds.map(key));
    return new Set(userIds.filter((id, i) => values[i] !== null));
  }

  const now = Date.now();
  return new Set(
    userIds.filter((id) => {
      const seen = memoryPresence.get(id);
      return seen !== undefined && now - seen < PRESENCE_TTL_SECONDS * 1000;
    })
  );
}
