import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = await params;

    // Handle timeout
    const result = GameManager.handleTimeOut(roomId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      gameState: result.gameState
    });

  } catch (error) {
    console.error('Error handling timeout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
