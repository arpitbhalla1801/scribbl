import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { validateRoomId } from '@/lib/validation';
import { listUserRelations, removeUserRelation, setUserRelation, type RelationType } from '@/lib/moderation';
import { logger } from '@/lib/logger';

function isRelationType(value: unknown): value is RelationType {
  return value === 'block' || value === 'mute';
}

export async function GET(request: NextRequest) {
  try {
    const relations = await listUserRelations(request.headers);
    return NextResponse.json({ success: true, relations });
  } catch (error) {
    logger.error('Error listing user relations', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await apiRateLimiter(getClientIdentifier(request));
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const { roomId, targetPlayerId, targetName, type } = await request.json();
    if (!roomId || !validateRoomId(roomId) || !targetPlayerId || !isRelationType(type)) {
      return NextResponse.json({ error: 'roomId, targetPlayerId, and a valid type are required' }, { status: 400 });
    }

    const result = await setUserRelation(request.headers, roomId, targetPlayerId, targetName ?? null, type);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error saving user relation', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { targetUserId, type } = await request.json();
    if (!targetUserId || !isRelationType(type)) {
      return NextResponse.json({ error: 'targetUserId and a valid type are required' }, { status: 400 });
    }

    const result = await removeUserRelation(request.headers, targetUserId, type);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'Sign-in required' ? 401 : 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error removing user relation', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
