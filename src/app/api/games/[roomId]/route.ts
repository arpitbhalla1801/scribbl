import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { validateRoomId } from '@/lib/validation';
import { sanitizeGameStateForPlayer } from '@/lib/gameStateSanitizer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    // Get playerId from query params first (needed for rate limiting)
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    // Rate limiting - use playerId for per-player limits on polling endpoint
    // This prevents players on the same IP from sharing rate limits
    const rateLimitId = playerId || getClientIdentifier(request);
    const rateLimitResult = apiRateLimiter(rateLimitId);
    
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
    
    // Validate roomId
    if (!validateRoomId(roomId)) {
      return NextResponse.json(
        { error: 'Invalid room ID format' },
        { status: 404 }
      );
    }

    const game = GameManager.getGame(roomId);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Sanitize game state to hide word from non-drawing players
    const sanitizedGame = playerId 
      ? sanitizeGameStateForPlayer(game, playerId)
      : game;

    return NextResponse.json({
      success: true,
      gameState: sanitizedGame
    });

  } catch (error) {
    console.error('Error getting game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = apiRateLimiter(clientId);
    
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

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    GameManager.removePlayer(roomId, playerId);

    return NextResponse.json({
      success: true,
      message: 'Player removed from game'
    });

  } catch (error) {
    console.error('Error removing player:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
