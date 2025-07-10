import { GameState, Player, GameSettings, DrawingStroke } from './types';
import { getRandomWords } from './words';

// In-memory storage for games (in production, you'd use a database)
const games: Map<string, GameState> = new Map();

export class GameManager {
  static createGame(roomId: string, hostName: string, settings: GameSettings): GameState {
    const host: Player = {
      id: this.generatePlayerId(),
      name: hostName,
      score: 0,
      isHost: true,
      isOnline: true,
    };

    const gameState: GameState = {
      roomId,
      status: 'waiting',
      players: [host],
      settings,
      currentRound: 0,
      timeRemaining: 0,
      drawing: [],
      guesses: [],
      roundScores: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    games.set(roomId, gameState);
    return gameState;
  }

  static getGame(roomId: string): GameState | null {
    return games.get(roomId) || null;
  }

  static joinGame(roomId: string, playerName: string): { success: boolean; player?: Player; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Game already in progress' };
    }

    if (game.players.length >= 8) {
      return { success: false, error: 'Game is full' };
    }

    if (game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      return { success: false, error: 'Player name already taken' };
    }

    const player: Player = {
      id: this.generatePlayerId(),
      name: playerName,
      score: 0,
      isHost: false,
      isOnline: true,
    };

    game.players.push(player);
    game.lastActivity = Date.now();

    return { success: true, player };
  }

  static startGame(roomId: string, playerId: string): { success: boolean; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.isHost) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (game.players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    game.status = 'playing';
    game.currentRound = 1;
    this.startRound(game);

    return { success: true };
  }

  static startRound(game: GameState): void {
    // Reset round state
    game.drawing = [];
    game.guesses = [];
    game.roundScores = {};
    game.timeRemaining = game.settings.timePerRound;

    // Choose random drawer (excluding previous drawer if possible)
    const availableDrawers = game.players.filter(p => p.isOnline);
    if (availableDrawers.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableDrawers.length);
      game.currentDrawer = availableDrawers[randomIndex].id;
    }

    // Choose random word based on difficulty
    const words = getRandomWords(game.settings.difficulty, 3);
    game.currentWord = words[0]; // In a real game, drawer would choose from 3 options

    game.lastActivity = Date.now();
  }

  static submitGuess(roomId: string, playerId: string, guess: string): { success: boolean; isCorrect: boolean; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, isCorrect: false, error: 'Game not found' };
    }

    if (game.status !== 'playing') {
      return { success: false, isCorrect: false, error: 'Game not in progress' };
    }

    if (playerId === game.currentDrawer) {
      return { success: false, isCorrect: false, error: 'Drawer cannot guess' };
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, isCorrect: false, error: 'Player not found' };
    }

    // Check if player already guessed correctly this round
    const hasCorrectGuess = game.guesses.some(g => g.playerId === playerId && g.isCorrect);
    if (hasCorrectGuess) {
      return { success: false, isCorrect: false, error: 'Already guessed correctly' };
    }

    const isCorrect = guess.toLowerCase().trim() === game.currentWord?.toLowerCase().trim();
    
    game.guesses.push({
      playerId,
      playerName: player.name,
      guess,
      timestamp: Date.now(),
      isCorrect,
    });

    if (isCorrect) {
      // Award points based on position and time remaining
      const correctGuesses = game.guesses.filter(g => g.isCorrect).length;
      const timeBonus = Math.floor(game.timeRemaining / 10);
      const positionBonus = Math.max(0, 100 - (correctGuesses - 1) * 20);
      const points = positionBonus + timeBonus;

      player.score += points;
      game.roundScores[playerId] = points;

      // Award points to drawer if someone guesses correctly
      const drawer = game.players.find(p => p.id === game.currentDrawer);
      if (drawer && correctGuesses === 1) {
        const drawerPoints = Math.floor(points * 0.5);
        drawer.score += drawerPoints;
        game.roundScores[game.currentDrawer!] = drawerPoints;
      }
    }

    game.lastActivity = Date.now();

    // Check if everyone (except drawer) has guessed correctly
    const nonDrawers = game.players.filter(p => p.id !== game.currentDrawer && p.isOnline);
    const correctGuessers = game.guesses.filter(g => g.isCorrect).map(g => g.playerId);
    const allGuessedCorrect = nonDrawers.every(p => correctGuessers.includes(p.id));

    if (allGuessedCorrect) {
      this.endRound(game);
    }

    return { success: true, isCorrect };
  }

  static updateDrawing(roomId: string, playerId: string, strokes: DrawingStroke[]): { success: boolean; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.currentDrawer !== playerId) {
      return { success: false, error: 'Only the current drawer can draw' };
    }

    game.drawing = strokes;
    game.lastActivity = Date.now();

    return { success: true };
  }

  static endRound(game: GameState): void {
    // Prevent infinite loops - ensure we don't exceed max rounds
    if (game.currentRound >= game.settings.rounds) {
      game.status = 'finished';
      game.timeRemaining = 0;
    } else {
      // Move to next round
      game.currentRound++;
      
      // Only start next round if game is still playing
      if (game.status === 'playing') {
        this.startRound(game);
      }
    }
  }

  static handleTimeOut(roomId: string): { success: boolean; gameState?: GameState; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'playing') {
      return { success: false, error: 'Game not in progress' };
    }

    // Set time to 0 to indicate round is over
    game.timeRemaining = 0;
    game.lastActivity = Date.now();

    // End the current round
    this.endRound(game);

    return { success: true, gameState: game };
  }

  static getCurrentGameState(roomId: string): { success: boolean; gameState?: GameState; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    return { success: true, gameState: game };
  }

  static removePlayer(roomId: string, playerId: string): void {
    const game = games.get(roomId);
    if (!game) return;

    game.players = game.players.filter(p => p.id !== playerId);
    
    // If host leaves, make someone else host
    if (game.players.length > 0 && !game.players.some(p => p.isHost)) {
      game.players[0].isHost = true;
    }

    // Clean up empty games
    if (game.players.length === 0) {
      games.delete(roomId);
    }
  }

  static generateRoomId(): string {
    let roomId: string;
    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (games.has(roomId));
    return roomId;
  }

  private static generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Cleanup inactive games (call this periodically)
  static cleanupInactiveGames(): void {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, game] of games.entries()) {
      if (now - game.lastActivity > INACTIVE_THRESHOLD) {
        games.delete(roomId);
      }
    }
  }
}
