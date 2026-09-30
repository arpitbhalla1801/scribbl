'use client';

import { useEffect } from 'react';
import { authClient } from '@/lib/authClient';

// A bit under presence.ts's 45s TTL, so a heartbeat lands before the
// previous one expires even with a slow/dropped request.
const HEARTBEAT_INTERVAL_MS = 20_000;

// #37/#38: gives every visitor a stable (if anonymous) BetterAuth identity
// before they ever sign in with Discord, so playerLinks has something to
// attach to from the first game they join. Gameplay works identically if
// this silently fails (no DATABASE_URL yet, network hiccup, etc).
//
// #44: also sends a periodic presence heartbeat while any page is open, not
// just while in a game room - crew online-status needs to know someone's
// around even when they're just browsing, not mid-game.
export function AutoAnonymousAuth() {
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data) authClient.signIn.anonymous();
    });
  }, []);

  useEffect(() => {
    const beat = () => fetch('/api/presence/heartbeat', { method: 'POST' }).catch(() => {});
    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
