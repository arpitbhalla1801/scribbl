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

function cookieName(roomId: string): string {
  return `sess_${roomId}`;
}

function sign(roomId: string, playerId: string): string {
  return createHmac('sha256', SESSION_SECRET).update(`${roomId}:${playerId}`).digest('hex');
}

export function setSessionCookie(response: NextResponse, roomId: string, playerId: string): void {
  response.cookies.set(cookieName(roomId), `${playerId}.${sign(roomId, playerId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function verifySession(request: NextRequest, roomId: string, playerId: string): boolean {
  const cookie = request.cookies.get(cookieName(roomId))?.value;
  if (!cookie) return false;

  const dot = cookie.indexOf('.');
  if (dot === -1) return false;
  const [cookiePlayerId, signature] = [cookie.slice(0, dot), cookie.slice(dot + 1)];
  if (cookiePlayerId !== playerId) return false;

  const expected = sign(roomId, playerId);
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
