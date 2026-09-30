import { randomInt } from 'crypto';
import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { auth } from './auth.ts';
import { db } from './db.ts';
import { crewInvites, crewMembers, crews, user } from './db/schema.ts';
import { getOnlineUserIds } from './presence.ts';
import { logger } from './logger.ts';

// Human-typeable invite code - CSPRNG, not because it's a security secret
// (it's meant to be shared), but because a predictable sequence would let
// someone enumerate other crews' invites.
const INVITE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const INVITE_CODE_LENGTH = 8;

// #42: soft cap on crew size. Enforced here (application code), not as a DB
// constraint, since "soft" means a future feature (e.g. reputation-based
// exceptions) can bend it without a migration.
export const MAX_CREW_MEMBERS = 15;

function membershipId(crewId: string, userId: string): string {
  return `${crewId}:${userId}`;
}

// #58: cheap membership check for event metadata - takes a userId directly
// (not headers/session) since the caller (events.ts) already resolved it.
export async function hasAnyCrew(userId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  try {
    const [row] = await db.select({ id: crewMembers.id }).from(crewMembers).where(eq(crewMembers.userId, userId)).limit(1);
    return !!row;
  } catch (error) {
    logger.warn('Failed to check crew membership', { error, userId });
    return false;
  }
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

async function isCrewMember(crewId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(eq(crewMembers.id, membershipId(crewId, userId)))
    .limit(1);
  return !!row;
}

// #43: creates a single-use invite. Any crew member can invite, not just
// the host.
export async function createInvite(
  headers: Headers,
  crewId: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const userId = await currentUserId(headers);
  if (!userId) return { success: false, error: 'Sign-in required' };
  if (!(await isCrewMember(crewId, userId))) {
    return { success: false, error: 'Not a member of this crew' };
  }

  try {
    const code = Array.from({ length: INVITE_CODE_LENGTH }, () => INVITE_CODE_CHARS[randomInt(INVITE_CODE_CHARS.length)]).join('');
    await db.insert(crewInvites).values({ id: uuidv7(), crewId, code, createdByUserId: userId });
    return { success: true, code };
  } catch (error) {
    logger.error('Failed to create crew invite', { error, crewId, userId });
    return { success: false, error: 'Internal error' };
  }
}

// Public preview - no auth required, so a shared link can show "Join
// {crewName}" before asking the visitor to sign in.
export async function getInvite(
  code: string
): Promise<{ crewId: string; crewName: string; status: string } | null> {
  if (!process.env.DATABASE_URL) return null;

  try {
    const [row] = await db
      .select({ crewId: crewInvites.crewId, crewName: crews.name, status: crewInvites.status })
      .from(crewInvites)
      .innerJoin(crews, eq(crewInvites.crewId, crews.id))
      .where(eq(crewInvites.code, code))
      .limit(1);
    return row ?? null;
  } catch (error) {
    logger.warn('Failed to look up crew invite', { error, code });
    return null;
  }
}

export async function acceptInvite(headers: Headers, code: string): Promise<{ success: boolean; crewId?: string; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const userId = await currentUserId(headers);
  if (!userId) return { success: false, error: 'Sign-in required' };

  try {
    const [invite] = await db.select().from(crewInvites).where(eq(crewInvites.code, code)).limit(1);
    if (!invite) return { success: false, error: 'Invite not found' };
    if (invite.status !== 'pending') return { success: false, error: 'Invite is no longer valid' };

    const added = await addCrewMember(invite.crewId, userId, 'player');
    if (!added.success) return added;

    await db
      .update(crewInvites)
      .set({ status: 'accepted', acceptedByUserId: userId, respondedAt: new Date() })
      .where(eq(crewInvites.id, invite.id));

    return { success: true, crewId: invite.crewId };
  } catch (error) {
    logger.error('Failed to accept crew invite', { error, code, userId });
    return { success: false, error: 'Internal error' };
  }
}

// Any crew member can cancel a pending invite, matching "anyone in the crew
// can invite" - invite management isn't host-only either.
export async function cancelInvite(headers: Headers, code: string): Promise<{ success: boolean; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const userId = await currentUserId(headers);
  if (!userId) return { success: false, error: 'Sign-in required' };

  try {
    const [invite] = await db.select().from(crewInvites).where(eq(crewInvites.code, code)).limit(1);
    if (!invite) return { success: false, error: 'Invite not found' };
    if (!(await isCrewMember(invite.crewId, userId))) {
      return { success: false, error: 'Not a member of this crew' };
    }
    if (invite.status !== 'pending') return { success: false, error: 'Invite is no longer valid' };

    await db
      .update(crewInvites)
      .set({ status: 'cancelled', respondedAt: new Date() })
      .where(eq(crewInvites.id, invite.id));
    return { success: true };
  } catch (error) {
    logger.error('Failed to cancel crew invite', { error, code, userId });
    return { success: false, error: 'Internal error' };
  }
}

// #44: member list + online status for a crew, gated on the caller
// actually being a member - membership and presence are both things a
// non-member shouldn't get to see.
export async function listCrewMembers(
  headers: Headers,
  crewId: string
): Promise<{ success: boolean; members?: { userId: string; name: string; role: string; online: boolean }[]; error?: string }> {
  if (!process.env.DATABASE_URL) {
    return { success: false, error: 'Not available yet' };
  }

  const callerId = await currentUserId(headers);
  if (!callerId) return { success: false, error: 'Sign-in required' };

  try {
    const rows = await db
      .select({ userId: crewMembers.userId, name: user.name, role: crewMembers.role })
      .from(crewMembers)
      .innerJoin(user, eq(crewMembers.userId, user.id))
      .where(eq(crewMembers.crewId, crewId));

    if (!rows.some(r => r.userId === callerId)) {
      return { success: false, error: 'Not a member of this crew' };
    }

    const onlineIds = await getOnlineUserIds(rows.map(r => r.userId));
    return { success: true, members: rows.map(r => ({ ...r, online: onlineIds.has(r.userId) })) };
  } catch (error) {
    logger.error('Failed to list crew members', { error, crewId });
    return { success: false, error: 'Internal error' };
  }
}
