// Run: node --test --test-force-exit src/lib/session.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie, verifySession } from './session.ts';

// Minimal fakes for the request.cookies.get / response.cookies.set surface
// session.ts actually touches - avoids pulling in Next's runtime, which
// isn't resolvable under plain `node --test`.
function fakeRequest(cookieHeader: Record<string, string>): NextRequest {
  return {
    cookies: {
      get: (name: string) => (name in cookieHeader ? { value: cookieHeader[name] } : undefined),
    },
  } as unknown as NextRequest;
}

function issuedCookie(roomId: string, playerId: string): string {
  const store = new Map<string, string>();
  const response = {
    cookies: { set: (name: string, value: string) => void store.set(name, value) },
  } as unknown as NextResponse;
  setSessionCookie(response, roomId, playerId);
  return store.get(`sess_${roomId}`)!;
}

test('a session issued for a room+player verifies for that pair', () => {
  const cookie = issuedCookie('ROOM01', 'player-a');
  assert.equal(verifySession(fakeRequest({ sess_ROOM01: cookie }), 'ROOM01', 'player-a'), true);
});

test('rejects when no cookie is sent', () => {
  assert.equal(verifySession(fakeRequest({}), 'ROOM01', 'player-a'), false);
});

test('rejects a playerId that does not match the cookie', () => {
  const cookie = issuedCookie('ROOM01', 'player-a');
  assert.equal(verifySession(fakeRequest({ sess_ROOM01: cookie }), 'ROOM01', 'player-b'), false);
});

test('rejects a cookie replayed against a different room', () => {
  const cookie = issuedCookie('ROOM01', 'player-a');
  assert.equal(verifySession(fakeRequest({ sess_ROOM02: cookie }), 'ROOM02', 'player-a'), false);
});

test('rejects a tampered signature', () => {
  const cookie = issuedCookie('ROOM01', 'player-a');
  const [id] = cookie.split('.');
  assert.equal(
    verifySession(fakeRequest({ sess_ROOM01: `${id}.${'0'.repeat(64)}` }), 'ROOM01', 'player-a'),
    false
  );
});
