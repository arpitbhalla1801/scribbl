import { and, eq } from 'drizzle-orm';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { playerLinks } from './db/schema.ts';
import { logger } from './logger.ts';

// #37: attaches an ephemeral per-game playerId to the signed-in (possibly
// anonymous) BetterAuth user, if any. Gameplay never reads this - it's
// best-effort groundwork for #42/#47/#48. A missing DATABASE_URL, a missing
// session, or a lookup failure should never block joining or creating a
// game, so every failure mode here just no-ops.
export async function attachPlayerToUser(
  headers: Headers,
  roomId: string,
  playerId: string
): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return;

    await db
      .insert(playerLinks)
      .values({ playerId, roomId, userId: session.user.id })
      .onConflictDoNothing();
  } catch (error) {
    logger.warn('Failed to link player to user', { error, roomId, playerId });
  }
}

// #46/#47: reverse lookup - a moderation action (block, mute, report) only
// ever has a target's ephemeral playerId (from the room they were seen in),
// not their userId. Returns null if the target was never linked (no
// DATABASE_URL, they never had a session, or the lookup fails) - callers
// treat that as "can't moderate this player yet", not an error.
export async function resolveUserId(roomId: string, playerId: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const [row] = await db
      .select({ userId: playerLinks.userId })
      .from(playerLinks)
      .where(and(eq(playerLinks.roomId, roomId), eq(playerLinks.playerId, playerId)))
      .limit(1);
    return row?.userId ?? null;
  } catch (error) {
    logger.warn('Failed to resolve user for player', { error, roomId, playerId });
    return null;
  }
}
