import { NextRequest, NextResponse } from 'next/server';
import { GameManager } from '@/lib/gameManager';
import { CreateGameRequest } from '@/lib/types';
import { createGameRateLimiter, getClientIdentifier } from '@/lib/rateLimit';
import { validateUsername, validateCustomWords } from '@/lib/validation';
import { initializeServer } from '@/lib/serverInit';
import { setSessionCookie } from '@/lib/session';
import { attachPlayerToUser } from '@/lib/playerLink';
import { logger } from '@/lib/logger';

// Initialize server services on first API call
initializeServer();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await createGameRateLimiter(clientId);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
          }
        }
      );
    }

    const body: CreateGameRequest = await request.json();
    const { playerName, settings } = body;

    // Validate input
    if (!playerName || !playerName.trim()) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(playerName);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    if (!settings || typeof settings.rounds !== 'number' || typeof settings.timePerRound !== 'number') {
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

    // Validate difficulty - an unrecognized value would later crash
    // getRandomWords() (wordsByDifficulty[difficulty] is undefined) after
    // the game has already been marked 'playing', leaving it permanently
    // stuck. GameSettings.difficulty is only a compile-time type; nothing
    // stops a raw request body from carrying an arbitrary string.
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (settings.difficulty !== undefined && !validDifficulties.includes(settings.difficulty)) {
      return NextResponse.json(
        { error: 'Difficulty must be one of: easy, medium, hard' },
        { status: 400 }
      );
    }

    // Validate custom word pack, if provided
    let customWords: string[] | undefined;
    if (settings.customWords !== undefined) {
      const customWordsValidation = validateCustomWords(settings.customWords);
      if (!customWordsValidation.valid) {
        return NextResponse.json(
          { error: customWordsValidation.error },
          { status: 400 }
        );
      }
      customWords = customWordsValidation.words;
    }

    // Provide default difficulty if not specified
    const gameSettings = {
      ...settings,
      difficulty: settings.difficulty || 'medium',
      customWords,
    };

    // Create the game
    const gameState = await GameManager.createGame(playerName.trim(), gameSettings);

    const response = NextResponse.json({
      success: true,
      roomId: gameState.roomId,
      playerId: gameState.players[0].id,
      gameState
    });
    setSessionCookie(response, gameState.roomId, gameState.players[0].id);
    await attachPlayerToUser(request.headers, gameState.roomId, gameState.players[0].id);
    return response;

  } catch (error) {
    logger.error('Error creating game', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
