import { NextRequest, NextResponse } from 'next/server';
import { validateRoomId } from '@/lib/validation';
import { getMutedPlayerIdsInRoom } from '@/lib/moderation';
import { logger } from '@/lib/logger';

// Called once per room-join, not on every poll - see getMutedPlayerIdsInRoom.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    if (!validateRoomId(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID format' }, { status: 400 });
    }

    const mutedPlayerIds = await getMutedPlayerIdsInRoom(request.headers, roomId);
    return NextResponse.json({ success: true, mutedPlayerIds });
  } catch (error) {
    logger.error('Error fetching muted players', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
