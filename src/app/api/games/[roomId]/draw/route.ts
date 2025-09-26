import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { DrawingUpdate } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body: DrawingUpdate = await request.json();

    // Validate input
    if (!body.playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    if (!['stroke', 'clear', 'tldraw_snapshot'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid update type' },
        { status: 400 }
      );
    }

    // Update the drawing
    const result = GameManager.updateDrawing(roomId, body);

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
