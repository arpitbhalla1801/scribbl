import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { crewMembers, crews } from './db/schema.ts';
import { logger } from './logger.ts';

// #42: soft cap on crew size. Enforced here (application code), not as a DB
// constraint, since "soft" means a future feature (e.g. reputation-based
// exceptions) can bend it without a migration.
export const MAX_CREW_MEMBERS = 15;

function membershipId(crewId: string, userId: string): string {
  return `${crewId}:${userId}`;
}

async function currentUserId(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

export async function createCrew(
  headers: Headers,
  name: string
): Promise<{ success: boolean; crew?: { id: string; name: string }; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const userId = await currentUserId(headers);
  if (!userId) return { success: false, error: 'Sign-in required' };

  try {
    const id = uuidv7();
    await db.insert(crews).values({ id, name });
    await db.insert(crewMembers).values({
      id: membershipId(id, userId),
      crewId: id,
      userId,
      role: 'host',
    });
    return { success: true, crew: { id, name } };
  } catch (error) {
    logger.error('Failed to create crew', { error, userId });
    return { success: false, error: 'Internal error' };
  }
}

export async function listMyCrews(
  headers: Headers
): Promise<{ id: string; name: string; role: string }[]> {
  if (!process.env.DATABASE_URL) return [];

  const userId = await currentUserId(headers);
  if (!userId) return [];

  try {
    const rows = await db
      .select({ id: crews.id, name: crews.name, role: crewMembers.role })
      .from(crewMembers)
      .innerJoin(crews, eq(crewMembers.crewId, crews.id))
      .where(eq(crewMembers.userId, userId));
    return rows;
  } catch (error) {
    logger.warn('Failed to list crews', { error, userId });
    return [];
  }
}

// Removes the caller's own membership. If that empties the crew, the crew
// itself is deleted too - an empty crew has no host to run it.
export async function leaveCrew(headers: Headers, crewId: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const userId = await currentUserId(headers);
  if (!userId) return { success: false, error: 'Sign-in required' };

  try {
    await db.delete(crewMembers).where(eq(crewMembers.id, membershipId(crewId, userId)));

    const remaining = await db
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(eq(crewMembers.crewId, crewId));
    if (remaining.length === 0) {
      await db.delete(crews).where(eq(crews.id, crewId));
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to leave crew', { error, userId, crewId });
    return { success: false, error: 'Internal error' };
  }
}

// #43 will call this when accepting an invite - exported now so that issue
// doesn't need to re-derive the cap/duplicate-membership checks.
export async function addCrewMember(
  crewId: string,
  userId: string,
  role: 'host' | 'player' = 'player'
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await db
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(eq(crewMembers.crewId, crewId));
    if (existing.some(m => m.id === membershipId(crewId, userId))) {
      return { success: false, error: 'Already in this crew' };
    }
    if (existing.length >= MAX_CREW_MEMBERS) {
      return { success: false, error: 'Crew is full' };
    }

    await db.insert(crewMembers).values({ id: membershipId(crewId, userId), crewId, userId, role });
    return { success: true };
  } catch (error) {
    logger.error('Failed to add crew member', { error, crewId, userId });
    return { success: false, error: 'Internal error' };
  }
}
