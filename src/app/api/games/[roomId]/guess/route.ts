import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { GuessRequest } from '@/lib/types';
import { guessRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { sanitizeMessage, validateRoomId } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Rate limiting - per client to prevent spam
    const clientId = getClientIdentifier(request);
    const rateLimitResult = guessRateLimiter(clientId);
    
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

    // Sanitize the guess
    const sanitizedGuess = sanitizeMessage(guess.trim());

    // Submit the guess
  const result = GameManager.submitGuess(roomId, playerId, sanitizedGuess);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const game = GameManager.getGame(roomId);

    return NextResponse.json({
      success: true,
      isCorrect: result.isCorrect,
      gameState: game
    });

  } catch (error) {
    console.error('Error submitting guess:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
