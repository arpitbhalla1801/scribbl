import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { sanitizeMessage, validateRoomId } from '@/lib/validation';
import { submitReport } from '@/lib/moderation';
import { verifySession } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimiter(clientId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) } }
      );
    }

    const { roomId } = await params;
    if (!validateRoomId(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID format' }, { status: 400 });
    }

    const { playerId, targetPlayerId, reason } = await request.json();
    if (!playerId || !targetPlayerId || !reason || !reason.trim()) {
      return NextResponse.json({ error: 'playerId, targetPlayerId, and reason are required' }, { status: 400 });
    }

    if (!verifySession(request, roomId, playerId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look the name up server-side rather than trusting the client, so a
    // report can't be filed under a spoofed display name.
    const game = await GameManager.getGame(roomId);
    const targetName = game?.players.find(p => p.id === targetPlayerId)?.name ?? 'Unknown player';

    const result = await submitReport(request.headers, roomId, targetPlayerId, targetName, sanitizeMessage(reason));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error submitting report', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
