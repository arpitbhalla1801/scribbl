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
