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

function issuedCookie(roomId: string, playerId: string): { name: string; value: string } {
  const store = new Map<string, string>();
  const response = {
    cookies: { set: (name: string, value: string) => void store.set(name, value) },
  } as unknown as NextResponse;
  setSessionCookie(response, roomId, playerId);
  const [[name, value]] = store;
  return { name, value };
}

test('a session issued for a room+player verifies for that pair', () => {
  const { name, value } = issuedCookie('ROOM01', 'player-a');
  assert.equal(verifySession(fakeRequest({ [name]: value }), 'ROOM01', 'player-a'), true);
});

test('rejects when no cookie is sent', () => {
  assert.equal(verifySession(fakeRequest({}), 'ROOM01', 'player-a'), false);
});

test('two players in the same room get separate cookies that do not collide', () => {
  const a = issuedCookie('ROOM01', 'player-a');
  const b = issuedCookie('ROOM01', 'player-b');
  assert.notEqual(a.name, b.name);

  const request = fakeRequest({ [a.name]: a.value, [b.name]: b.value });
  assert.equal(verifySession(request, 'ROOM01', 'player-a'), true);
  assert.equal(verifySession(request, 'ROOM01', 'player-b'), true);
});

test('rejects a cookie replayed against a different room', () => {
  const { value } = issuedCookie('ROOM01', 'player-a');
  // simulate the value landing under a different room's cookie name
  assert.equal(verifySession(fakeRequest({ sess_ROOM02_player_a: value }), 'ROOM02', 'player-a'), false);
});

test('rejects a tampered signature', () => {
  const { name } = issuedCookie('ROOM01', 'player-a');
  assert.equal(verifySession(fakeRequest({ [name]: '0'.repeat(64) }), 'ROOM01', 'player-a'), false);
});
