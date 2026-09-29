import Redis from 'ioredis';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Same Redis as the game store, so limits hold across instances. Falls back
// to an in-memory Map when there's no REDIS_URL (local dev).
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : undefined;

interface MemoryEntry {
  count: number;
  resetTime: number;
}
const memoryMap = new Map<string, MemoryEntry>();

function memoryLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryMap.get(key);

  if (Math.random() < 0.01) {
    for (const [k, e] of memoryMap.entries()) {
      if (now > e.resetTime) memoryMap.delete(k);
    }
  }

  if (!entry || now > entry.resetTime) {
    const fresh: MemoryEntry = { count: 1, resetTime: now + config.windowMs };
    memoryMap.set(key, fresh);
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: fresh.resetTime };
  }

  entry.count++;
  return {
    allowed: entry.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

// INCR + PEXPIRE, not a single atomic script: worst case two requests both
// land the first hit of a window and both set the same expiry, which just
// means the window resets a few ms later than it should. Fine for a rate
// limiter.
async function redisLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const count = await redis!.incr(key);
  if (count === 1) await redis!.pexpire(key, config.windowMs);
  const ttl = count === 1 ? config.windowMs : await redis!.pttl(key);
  return {
    allowed: count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - count),
    resetTime: Date.now() + Math.max(ttl, 0),
  };
}

// name namespaces the key so different limiters (api/guess/createGame) on
// the same identifier don't stomp each other's counts.
export function rateLimit(name: string, config: RateLimitConfig) {
  return (identifier: string): Promise<RateLimitResult> => {
    const key = `ratelimit:${name}:${identifier}`;
    return redis ? redisLimit(key, config) : Promise.resolve(memoryLimit(key, config));
  };
}

// Common rate limiters
export const apiRateLimiter = rateLimit('api', {
  windowMs: 60 * 1000, // 60 seconds (1 minute)
  maxRequests: 120, // 120 requests per minute (allows polling every 0.5 seconds with buffer)
});

export const guessRateLimiter = rateLimit('guess', {
  windowMs: 1000, // 1 second
  maxRequests: 5, // 5 guesses per second
});

export const createGameRateLimiter = rateLimit('createGame', {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 games per minute (increased from 3)
});

// Helper to get client identifier (IP address or session)
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  return forwardedFor?.split(',')[0] || realIp || 'unknown';
}
