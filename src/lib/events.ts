import { and, eq, gte } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { db } from './db.ts';
import { events } from './db/schema.ts';
import { hasAnyCrew } from './crews.ts';
import { logger } from './logger.ts';

const D7_MS = 7 * 24 * 60 * 60 * 1000;

// #58/#60: fires on every game join/create. Best-effort like
// attachPlayerToUser - userId is null (no DATABASE_URL, no session) just
// means there's nothing to log yet, never a blocked join/create.
export async function recordGameJoinEvent(userId: string | null, roomId: string): Promise<void> {
  if (!process.env.DATABASE_URL || !userId) return;

  try {
    const sevenDaysAgo = new Date(Date.now() - D7_MS);
    const [priorVisit] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.type, 'game_joined'), gte(events.createdAt, sevenDaysAgo)))
      .limit(1);

    await db.insert(events).values({
      id: uuidv7(),
      userId,
      type: 'game_joined',
      metadata: {
        roomId,
        isReturn: !!priorVisit, // #60: baseline D7 return, any user
        hasCrew: await hasAnyCrew(userId), // #58: lets the same D7 rate be split by crew membership
      },
    });
  } catch (error) {
    logger.warn('Failed to record game_joined event', { error, userId, roomId });
  }
}
