import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { anonymous } from 'better-auth/plugins';
import { v7 as uuidv7 } from 'uuid';
import { db } from './db.ts';
import * as schema from './db/schema.ts';

// #38/#39: anonymous sessions by default, upgraded to Discord on sign-in.
// Google is deliberately not configured (D16) - Discord-only fits the
// group/crew wedge (#42-44) this is laying groundwork for.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    },
  },
  plugins: [anonymous()],
  // #41: UUID v7 for DB entity IDs (user/session/account/verification) -
  // time-ordered, so inserts stay index-local instead of scattering across
  // the btree the way v4's pure randomness does.
  advanced: {
    database: {
      generateId: () => uuidv7(),
    },
  },
});
