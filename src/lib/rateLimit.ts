// Simple in-memory rate limiter
// In production, use Redis for distributed rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export function rateLimit(config: RateLimitConfig) {
  return (identifier: string): { allowed: boolean; remaining: number; resetTime: number } => {
    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      cleanupExpiredEntries(now);
    }

    if (!entry || now > entry.resetTime) {
      // Create new entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      rateLimitMap.set(identifier, newEntry);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Update existing entry
    entry.count++;
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  };
}

function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Common rate limiters
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 60 seconds (1 minute)
  maxRequests: 120, // 120 requests per minute (allows polling every 0.5 seconds with buffer)
});

export const drawRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds  
  maxRequests: 200, // 200 draw updates per 10 seconds (very fast drawing)
});

export const guessRateLimiter = rateLimit({
  windowMs: 1000, // 1 second
  maxRequests: 5, // 5 guesses per second
});

export const createGameRateLimiter = rateLimit({
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
