import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { JoinGameRequest } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    const body: JoinGameRequest = await request.json();
    const { playerName } = body;

    // Validate input
    if (!playerName || !playerName.trim()) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    // Try to join the game
    const result = GameManager.joinGame(roomId, playerName.trim());

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const game = GameManager.getGame(roomId);

    return NextResponse.json({
      success: true,
      playerId: result.player!.id,
      gameState: game
    });

  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
