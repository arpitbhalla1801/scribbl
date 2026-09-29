import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

declare global {
  var sessionSecret: string | undefined;
}

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET is required in production');
}

// playerId alone (visible in the URL, localStorage, browser history) is not
// enough to act as that player - every request also needs this HttpOnly
// cookie, signed per room+player so it can't be forged or reused elsewhere.
// The dev fallback goes on `global` so it survives Next's per-route module
// reloads in dev - otherwise every route recompile invalidates every cookie
// already issued.
const SESSION_SECRET =
  process.env.SESSION_SECRET || (global.sessionSecret ??= randomBytes(32).toString('hex'));

const COOKIE_MAX_AGE = 3 * 60 * 60; // matches room TTL in store.ts

// Named per room AND player - two players in the same room sharing a
// browser (e.g. two tabs for local testing) would otherwise get the same
// cookie name and the second join's Set-Cookie would silently clobber the
// first player's session.
function cookieName(roomId: string, playerId: string): string {
  return `sess_${roomId}_${playerId}`;
}

function sign(roomId: string, playerId: string): string {
  return createHmac('sha256', SESSION_SECRET).update(`${roomId}:${playerId}`).digest('hex');
}

export function setSessionCookie(response: NextResponse, roomId: string, playerId: string): void {
  response.cookies.set(cookieName(roomId, playerId), sign(roomId, playerId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function verifySession(request: NextRequest, roomId: string, playerId: string): boolean {
  const signature = request.cookies.get(cookieName(roomId, playerId))?.value;
  if (!signature) return false;

  const expected = sign(roomId, playerId);
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
