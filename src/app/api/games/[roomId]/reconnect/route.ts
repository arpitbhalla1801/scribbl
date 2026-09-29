import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { apiRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { validateRoomId } from '@/lib/validation';
import { sanitizeGameStateForPlayer } from '@/lib/gameStateSanitizer';
import { setSessionCookie, verifySession } from '@/lib/session';

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

    // playerId alone isn't proof of identity - it's visible in the URL and
    // localStorage, so a stranger who obtains it could otherwise reconnect
    // as that player. The session cookie set on create/join has to match too.
    if (!verifySession(request, roomId, playerId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to reconnect the player
    const result = await GameManager.reconnectPlayer(roomId, playerId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const sanitizedGame = result.gameState
      ? sanitizeGameStateForPlayer(result.gameState, playerId)
      : result.gameState;

    const response = NextResponse.json({
      success: true,
      gameState: sanitizedGame
    });
    setSessionCookie(response, roomId, playerId); // refresh expiry
    return response;

  } catch (error) {
    console.error('Error reconnecting player:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
