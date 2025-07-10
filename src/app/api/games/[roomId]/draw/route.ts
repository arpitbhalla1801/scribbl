import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { DrawingUpdate } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;
    const body: DrawingUpdate = await request.json();
    const { playerId, strokes } = body;

    // Validate input
    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(strokes)) {
      return NextResponse.json(
        { error: 'Strokes must be an array' },
        { status: 400 }
      );
    }

    // Update the drawing
    const result = GameManager.updateDrawing(roomId, playerId, strokes);

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
    console.error('Error updating drawing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
