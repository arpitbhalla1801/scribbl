import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    const game = GameManager.getGame(roomId);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      gameState: game
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
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
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
