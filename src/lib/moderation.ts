import { and, eq, inArray } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { playerLinks, reports, userRelations } from './db/schema.ts';
import { resolveUserId } from './playerLink.ts';
import { logger } from './logger.ts';

export type RelationType = 'block' | 'mute';

async function currentUserId(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

function relationId(ownerUserId: string, targetUserId: string, type: RelationType): string {
  return `${ownerUserId}:${targetUserId}:${type}`;
}

// #47: block or mute a player seen in a specific room. The caller only
// knows the target's ephemeral playerId - this resolves it to a durable
// userId first. Explicit failures (not best-effort) since this is a direct
// user action, not background bookkeeping.
export async function setUserRelation(
  headers: Headers,
  roomId: string,
  targetPlayerId: string,
  targetName: string,
  type: RelationType,
  // Default is the real lookup - overridable in tests, since resolveUserId
  // is an ES module export and can't be mocked from outside via mock.method.
  resolveTargetUserId: typeof resolveUserId = resolveUserId
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const ownerUserId = await currentUserId(headers);
  if (!ownerUserId) return { success: false, error: 'Sign-in required' };

  const targetUserId = await resolveTargetUserId(roomId, targetPlayerId);
  if (!targetUserId) return { success: false, error: 'That player can’t be moderated yet' };

  if (targetUserId === ownerUserId) {
    return { success: false, error: 'Can’t block or mute yourself' };
  }

  try {
    await db
      .insert(userRelations)
      .values({ id: relationId(ownerUserId, targetUserId, type), ownerUserId, targetUserId, type, targetName })
      .onConflictDoNothing();
    return { success: true };
  } catch (error) {
    logger.error('Failed to save user relation', { error, ownerUserId, targetUserId, type });
    return { success: false, error: 'Internal error' };
  }
}

export async function removeUserRelation(
  headers: Headers,
  targetUserId: string,
  type: RelationType
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const ownerUserId = await currentUserId(headers);
  if (!ownerUserId) return { success: false, error: 'Sign-in required' };

  try {
    await db.delete(userRelations).where(eq(userRelations.id, relationId(ownerUserId, targetUserId, type)));
    return { success: true };
  } catch (error) {
    logger.error('Failed to remove user relation', { error, ownerUserId, targetUserId, type });
    return { success: false, error: 'Internal error' };
  }
}

export async function listUserRelations(
  headers: Headers
): Promise<{ targetUserId: string; targetName: string | null; type: string }[]> {
  if (!process.env.DATABASE_URL) return [];

  const ownerUserId = await currentUserId(headers);
  if (!ownerUserId) return [];

  try {
    return await db
      .select({
        targetUserId: userRelations.targetUserId,
        targetName: userRelations.targetName,
        type: userRelations.type,
      })
      .from(userRelations)
      .where(eq(userRelations.ownerUserId, ownerUserId));
  } catch (error) {
    logger.warn('Failed to list user relations', { error, ownerUserId });
    return [];
  }
}

// One-shot per room-join (not per poll): which playerIds in this room
// belong to a user the viewer has blocked or muted, so the client can
// filter them out of the chat feed itself. Deliberately not wired into the
// hot per-second game-state poll - that would mean a DB round trip every
// second for every connected player.
export async function getMutedPlayerIdsInRoom(headers: Headers, roomId: string): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];

  const viewerUserId = await currentUserId(headers);
  if (!viewerUserId) return [];

  try {
    const relations = await db
      .select({ targetUserId: userRelations.targetUserId })
      .from(userRelations)
      .where(eq(userRelations.ownerUserId, viewerUserId));
    if (relations.length === 0) return [];

    const blockedUserIds = relations.map(r => r.targetUserId);
    const links = await db
      .select({ playerId: playerLinks.playerId })
      .from(playerLinks)
      .where(and(eq(playerLinks.roomId, roomId), inArray(playerLinks.userId, blockedUserIds)));
    return links.map(l => l.playerId);
  } catch (error) {
    logger.warn('Failed to resolve muted players for room', { error, roomId });
    return [];
  }
}

// #46: post-game report, captured for manual review (no automated action
// yet - "AI OCR/image moderation comes later" per the issue).
export async function submitReport(
  headers: Headers,
  roomId: string,
  reportedPlayerId: string,
  reportedName: string,
  reason: string,
  resolveTargetUserId: typeof resolveUserId = resolveUserId
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  try {
    const [reporterUserId, reportedUserId] = await Promise.all([
      currentUserId(headers),
      resolveTargetUserId(roomId, reportedPlayerId),
    ]);

    await db.insert(reports).values({
      id: uuidv7(), // #41: UUID v7 for DB entity IDs
      roomId,
      reporterUserId,
      reportedUserId,
      reportedName,
      reason,
    });
    return { success: true };
  } catch (error) {
    logger.error('Failed to save report', { error, roomId, reportedPlayerId });
    return { success: false, error: 'Internal error' };
  }
}
