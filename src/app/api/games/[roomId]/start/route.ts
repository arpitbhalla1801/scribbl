import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { validateRoomId } from '@/lib/validation';
import { sanitizeGameStateForPlayer } from '@/lib/gameStateSanitizer';
import { setSessionCookie, verifySession } from '@/lib/session';
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

    const body = await request.json();
    const { playerId } = body;

    // Validate input
    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    if (!verifySession(request, roomId, playerId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to start the game
    const result = await GameManager.startGame(roomId, playerId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const game = await GameManager.getGame(roomId, playerId);
    const sanitizedGame = game ? sanitizeGameStateForPlayer(game, playerId) : game;

    const response = NextResponse.json({
      success: true,
      gameState: sanitizedGame
    });
    setSessionCookie(response, roomId, playerId);
    return response;

  } catch (error) {
    logger.error('Error starting game', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
