'use client';

import { authClient } from '@/lib/authClient';

// #38: upgrades the visitor's anonymous BetterAuth session to a real
// Discord-backed one. BetterAuth's anonymous plugin transfers the
// anonymous user's data to the linked account automatically.
export function SignInWithDiscord() {
  return (
    <button
      type="button"
      onClick={() => authClient.signIn.social({ provider: 'discord' })}
      className="text-secondary text-sm underline underline-offset-2 hover:text-[var(--ink)]"
    >
      Sign in with Discord
    </button>
  );
}
