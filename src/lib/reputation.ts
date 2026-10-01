import { and, eq } from 'drizzle-orm';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { events, reports, userRelations } from './db/schema.ts';
import { logger } from './logger.ts';

// #48: a simple negative-signal count, no scoring formula or decay yet -
// just "how many red flags does this user have". Mutes aren't counted:
// a mute is a personal preference ("I don't want to see this person"), not
// evidence of misbehavior the way a vote-kick, a report, or a block is.
export interface Reputation {
  timesKicked: number;
  timesReported: number;
  timesBlocked: number;
  flagCount: number;
}

const EMPTY_REPUTATION: Reputation = { timesKicked: 0, timesReported: 0, timesBlocked: 0, flagCount: 0 };

export async function getReputation(userId: string): Promise<Reputation> {
  if (!process.env.DATABASE_URL) return EMPTY_REPUTATION;

  try {
    const [kicked, reported, blocked] = await Promise.all([
      db.select({ id: events.id }).from(events).where(and(eq(events.userId, userId), eq(events.type, 'vote_kicked'))),
      db.select({ id: reports.id }).from(reports).where(eq(reports.reportedUserId, userId)),
      db
        .select({ id: userRelations.id })
        .from(userRelations)
        .where(and(eq(userRelations.targetUserId, userId), eq(userRelations.type, 'block'))),
    ]);

    const timesKicked = kicked.length;
    const timesReported = reported.length;
    const timesBlocked = blocked.length;
    return { timesKicked, timesReported, timesBlocked, flagCount: timesKicked + timesReported + timesBlocked };
  } catch (error) {
    logger.warn('Failed to compute reputation', { error, userId });
    return EMPTY_REPUTATION;
  }
}

// Backend-only for now (no UI consumer) - scoped to the caller's own
// reputation. Looking up someone else's isn't needed by anything yet, and
// is its own privacy/moderation question better answered when a real
// consumer shows up.
export async function getMyReputation(headers: Headers): Promise<{ success: boolean; reputation?: Reputation; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const session = await auth.api.getSession({ headers });
  if (!session?.user) return { success: false, error: 'Sign-in required' };

  return { success: true, reputation: await getReputation(session.user.id) };
}
