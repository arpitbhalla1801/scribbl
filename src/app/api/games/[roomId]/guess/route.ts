import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { GuessRequest } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    const body: GuessRequest = await request.json();
  const { playerId, guess, timeLeft } = body;

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

    // Submit the guess
  const result = GameManager.submitGuess(roomId, playerId, guess.trim(), timeLeft);

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
