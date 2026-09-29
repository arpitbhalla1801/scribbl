import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { GuessRequest } from '@/lib/types';
import { guessRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { sanitizeMessage, validateRoomId } from '@/lib/validation';
import { sanitizeGameStateForPlayer } from '@/lib/gameStateSanitizer';
import { setSessionCookie, verifySession } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Rate limiting - per client to prevent spam
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await guessRateLimiter(clientId);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many guesses. Please slow down.' },
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

    const body: GuessRequest = await request.json();
  const { playerId, guess } = body;

    // Validate input
    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    if (!guess || !guess.trim()) {
      return NextResponse.json(
        { error: 'Guess is required' },
        { status: 400 }
      );
    }

    if (!verifySession(request, roomId, playerId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sanitize the guess
    const sanitizedGuess = sanitizeMessage(guess.trim());

    // Submit the guess
  const result = await GameManager.submitGuess(roomId, playerId, sanitizedGuess);

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
      isCorrect: result.isCorrect,
      gameState: sanitizedGame
    });
    setSessionCookie(response, roomId, playerId);
    return response;

  } catch (error) {
    console.error('Error submitting guess:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
