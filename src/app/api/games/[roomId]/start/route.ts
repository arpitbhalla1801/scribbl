import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId } = body;

    // Validate input
    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Try to start the game
    const result = GameManager.startGame(roomId, playerId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const game = GameManager.getGame(roomId);

    return NextResponse.json({
      success: true,
      gameState: game
    });

  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
