import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { CreateGameRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateGameRequest = await request.json();
    const { playerName, settings } = body;

    // Validate input
    if (!playerName || !playerName.trim()) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    if (!settings || !settings.rounds || !settings.timePerRound || !settings.difficulty) {
      return NextResponse.json(
        { error: 'Game settings are required' },
        { status: 400 }
      );
    }

    // Validate settings
    if (settings.rounds < 2 || settings.rounds > 10) {
      return NextResponse.json(
        { error: 'Rounds must be between 2 and 10' },
        { status: 400 }
      );
    }

    if (settings.timePerRound < 30 || settings.timePerRound > 300) {
      return NextResponse.json(
        { error: 'Time per round must be between 30 and 300 seconds' },
        { status: 400 }
      );
    }

    if (!['easy', 'medium', 'hard'].includes(settings.difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      );
    }

    // Generate unique room ID
    const roomId = GameManager.generateRoomId();

    // Create the game
    const gameState = GameManager.createGame(roomId, playerName.trim(), settings);

    return NextResponse.json({
      success: true,
      roomId,
      playerId: gameState.players[0].id,
      gameState
    });

  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
