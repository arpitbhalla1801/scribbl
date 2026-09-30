'use client';

import { useEffect } from 'react';
import { authClient } from '@/lib/authClient';

// #37/#38: gives every visitor a stable (if anonymous) BetterAuth identity
// before they ever sign in with Discord, so playerLinks has something to
// attach to from the first game they join. Gameplay works identically if
// this silently fails (no DATABASE_URL yet, network hiccup, etc).
export function AutoAnonymousAuth() {
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (!data) authClient.signIn.anonymous();
    });
  }, []);

  return null;
}
