import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { validateRoomId } from '@/lib/validation';
import { sanitizeGameStateForPlayer } from '@/lib/gameStateSanitizer';
import { verifySession } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimiter(clientId);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
          }
        }
      );
    }

    const { roomId } = await params;
    
    // Validate roomId
    if (!validateRoomId(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room ID format' },
        { status: 400 }
      );
    }

    // playerId is optional here for backwards compatibility, but required to
    // sanitize the response - without it we fall back to returning raw state.
    let playerId: string | undefined;
    try {
      const body = await request.json();
      playerId = body?.playerId;
    } catch {
      playerId = undefined;
    }

    // playerId here only controls response sanitization (no drawer-only
    // action to gate) - if it's given but doesn't match the session, drop
    // it rather than use it to unmask the word.
    if (playerId && !verifySession(request, roomId, playerId)) {
      playerId = undefined;
    }

    // Handle timeout
    const result = await GameManager.handleTimeOut(roomId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const sanitizedGame = result.gameState && playerId
      ? sanitizeGameStateForPlayer(result.gameState, playerId)
      : result.gameState;

    return NextResponse.json({
      success: true,
      gameState: sanitizedGame
    });

  } catch (error) {
    logger.error('Error handling timeout', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
