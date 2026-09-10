import { randomInt, randomUUID } from 'crypto';
import { GameState, Player, GameSettings, DrawingUpdate } from './types';
import { getRandomWords } from './words';
import { filterProfanity } from './validation';

// Declare global broadcast function (set by server.js)
declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var broadcastToRoom: ((roomId: string, message: any) => void) | undefined;
  // eslint-disable-next-line no-var
  var gamesStore: Map<string, GameState> | undefined;
  // eslint-disable-next-line no-var
  var gameTimersStore: Map<string, NodeJS.Timeout> | undefined;
}

// In-memory storage for games (in production, you'd use a database)
// Use global to persist across HMR reloads in development
const games: Map<string, GameState> = global.gamesStore || new Map();
if (!global.gamesStore) {
  global.gamesStore = games;
}

// Server-side timers for each game
const gameTimers: Map<string, NodeJS.Timeout> = global.gameTimersStore || new Map();
if (!global.gameTimersStore) {
  global.gameTimersStore = gameTimers;
}

// A player is considered offline once this long has passed since their last
// request. The live client polls every 1s, so this leaves generous headroom
// for network jitter without letting a truly-gone player linger too long.
const HEARTBEAT_TIMEOUT_MS = 5000;

export class GameManager {
  static createGame(roomId: string, hostName: string, settings: GameSettings): GameState {
    const host: Player = {
      id: this.generatePlayerId(),
      name: hostName,
      score: 0,
      isHost: true,
      isOnline: true,
      lastSeenAt: Date.now(),
    };

    const gameState: GameState = {
      roomId,
      status: 'waiting',
      players: [host],
      settings,
      currentRound: 0,
      currentTurn: 0,
      totalTurns: 0, // Will be set when game starts
      timeRemaining: 0,
      guesses: [],
      roundScores: {},
      drawingOrder: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    games.set(roomId, gameState);
    return gameState;
  }

  static getGame(roomId: string, callerId?: string): GameState | null {
    const game = games.get(roomId) || null;
    if (game) {
      // Record a heartbeat for whichever player made this request, and mark
      // anyone who hasn't been seen recently as offline. The live client
      // polls this endpoint every second for every connected player, so it
      // doubles as the presence signal - a closed tab simply stops calling it.
      this.updatePresence(game, callerId);

      // Update time remaining based on elapsed time for more accurate sync
      this.updateTimeRemaining(game);

      // Auto-end turn if time has expired
      if (game.status === 'playing' && game.timeRemaining <= 0) {
        this.endTurn(game);
      }
    }
    return game;
  }

  private static updatePresence(game: GameState, callerId?: string): void {
    const now = Date.now();
    for (const player of game.players) {
      if (player.id === callerId) {
        player.lastSeenAt = now;
        player.isOnline = true;
      } else if (now - (player.lastSeenAt ?? 0) > HEARTBEAT_TIMEOUT_MS) {
        player.isOnline = false;
      }
    }
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
      lastSeenAt: Date.now(),
    };

    game.players.push(player);
    game.lastActivity = Date.now();

    this.broadcastGameUpdate(roomId);
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
    game.currentTurn = 1;
    
    // Set up drawing order: each player draws once per round
    const onlinePlayers = game.players.filter(p => p.isOnline);
    game.drawingOrder = [...onlinePlayers.map(p => p.id)];
    game.totalTurns = onlinePlayers.length * game.settings.rounds;
    
    this.startTurn(game);

    this.broadcastGameUpdate(roomId);
    return { success: true };
  }

  static startTurn(game: GameState): void {
    // Reset turn state
    game.tldrawSnapshot = undefined; // Clear tldraw snapshot for new turn
    game.guesses = [];
    game.roundScores = {};
    game.timeRemaining = game.settings.timePerRound;
    game.turnStartTime = undefined; // Don't start timer until word is selected

    // Clear any existing timer for this game
    this.clearGameTimer(game.roomId);

    // Calculate which player should draw based on current turn, using the
    // fixed drawingOrder established at game start (skipping anyone who has
    // since left the game entirely, or is currently offline) - not a fresh
    // re-filter of game.players, which would silently reshuffle everyone's
    // turn position whenever the online player count changes mid-game.
    const eligibleDrawOrder = game.drawingOrder.filter(id => {
      const player = game.players.find(p => p.id === id);
      return player !== undefined && player.isOnline;
    });
    const playerIndex = (game.currentTurn - 1) % eligibleDrawOrder.length;

    if (eligibleDrawOrder.length > 0) {
      game.currentDrawer = eligibleDrawOrder[playerIndex];
    }

    // Choose 3 random words for the drawer to select from
    const words = getRandomWords(game.settings.difficulty || 'medium', 3);
    game.wordChoices = words;
    game.currentWord = undefined; // No word selected yet
    game.status = 'word-selection';
    game.wordSelectionDeadline = Date.now() + 10000; // 10 seconds to choose

    // Start word selection timeout timer
    const wordSelectionTimer = setTimeout(() => {
      // Auto-select first word if drawer doesn't choose in time
      if (game.status === 'word-selection' && game.wordChoices && game.wordChoices.length > 0) {
        this.selectWord(game.roomId, game.currentDrawer || '', 0);
      }
    }, 10000);

    gameTimers.set(`${game.roomId}-word-selection`, wordSelectionTimer);
    game.lastActivity = Date.now();
    
    this.broadcastGameUpdate(game.roomId);
  }

  static selectWord(roomId: string, playerId: string, wordIndex: number): { success: boolean; gameState?: GameState; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'word-selection') {
      return { success: false, error: 'Not in word selection phase' };
    }

    if (game.currentDrawer !== playerId) {
      return { success: false, error: 'Only the drawer can select a word' };
    }

    if (!game.wordChoices || wordIndex < 0 || wordIndex >= game.wordChoices.length) {
      return { success: false, error: 'Invalid word selection' };
    }

    // Clear word selection timer
    const wordSelectionTimer = gameTimers.get(`${game.roomId}-word-selection`);
    if (wordSelectionTimer) {
      clearTimeout(wordSelectionTimer);
      gameTimers.delete(`${game.roomId}-word-selection`);
    }

    // Set the selected word
    game.currentWord = game.wordChoices[wordIndex];
    game.wordChoices = undefined; // Clear choices
    game.status = 'playing';
    game.turnStartTime = Date.now(); // Start timer now
    game.wordSelectionDeadline = undefined;

    console.log(`[Game] Word selected for room ${roomId}. Timer started at ${game.turnStartTime}, duration: ${game.settings.timePerRound}s`);

    // Start the round timer
    this.startGameTimer(game);

    game.lastActivity = Date.now();

    this.broadcastGameUpdate(roomId);
    return { success: true, gameState: game };
  }

  static updateDrawing(roomId: string, update: DrawingUpdate): { success: boolean; gameState?: GameState; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'playing') {
      return { success: false, error: 'Game not in progress' };
    }

    // Only allow the current drawer to update the drawing
    if (game.currentDrawer !== update.playerId) {
      return { success: false, error: 'Only the current drawer can update the drawing' };
    }

    if (update.type === 'tldraw_snapshot' && update.tldrawSnapshot) {
      game.tldrawSnapshot = {
        snapshot: update.tldrawSnapshot,
        lastUpdatedBy: update.playerId,
        timestamp: Date.now()
      };
    }

    game.lastActivity = Date.now();

    this.broadcastGameUpdate(roomId);
    return { success: true, gameState: game };
  }

  static submitGuess(roomId: string, playerId: string, guess: string): { 
    success: boolean; 
    isCorrect?: boolean; 
    gameState?: GameState; 
    error?: string 
  } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'playing') {
      return { success: false, error: 'Game not in progress' };
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Don't allow the current drawer to guess
    if (game.currentDrawer === playerId) {
      return { success: false, error: 'Drawer cannot guess' };
    }

    // Check if player already guessed correctly this round
    if (game.guesses.some(g => g.playerId === playerId && g.isCorrect)) {
      return { success: false, error: 'Already guessed correctly' };
    }

    const isCorrect = guess.toLowerCase().trim() === game.currentWord?.toLowerCase().trim();

    // Filter profanity from the guess text that gets displayed in chat when
    // incorrect (correct guesses are never shown verbatim - see
    // gameStateSanitizer). Filtering happens after the correctness check
    // above so it can never cause a legitimate correct guess to be missed.
    const displayGuess = filterProfanity(guess.trim());

    // Add guess to game state
    game.guesses.push({
      playerId,
      playerName: player.name,
      guess: displayGuess,
      isCorrect,
      timestamp: Date.now(),
    });

    // Award points if correct
    if (isCorrect) {
      // Calculate time bonus based on server time only (prevents client manipulation)
      const elapsed = Date.now() - (game.turnStartTime || Date.now());
      const timeRemaining = Math.max(0, game.settings.timePerRound - Math.floor(elapsed / 1000));
      
      // Points: base 100 + up to 100 bonus for speed (linear)
      const maxBonus = 100;
      const totalTime = game.settings.timePerRound;
      const bonus = Math.round((timeRemaining / totalTime) * maxBonus);
      const points = 100 + bonus;

      player.score += points;

      // Add to round scores
      if (!game.roundScores[playerId]) {
        game.roundScores[playerId] = 0;
      }
      game.roundScores[playerId] += points;

      // Award points to drawer too (half of guesser's points)
      const drawer = game.players.find(p => p.id === game.currentDrawer);
      if (drawer) {
        const drawerPoints = Math.floor(points * 0.5);
        drawer.score += drawerPoints;

        if (!game.roundScores[drawer.id]) {
          game.roundScores[drawer.id] = 0;
        }
        game.roundScores[drawer.id] += drawerPoints;
      }

      // Check if all players have guessed correctly
      const eligiblePlayers = game.players.filter(p => p.id !== game.currentDrawer && p.isOnline);
      const correctGuesses = game.guesses.filter(g => g.isCorrect);

      if (correctGuesses.length >= eligiblePlayers.length) {
        // End turn early - everyone guessed correctly
        this.endTurn(game);
      }
    }

    game.lastActivity = Date.now();

    this.broadcastGameUpdate(roomId);
    return { success: true, isCorrect, gameState: game };
  }

  static setPlayerOffline(roomId: string, playerId: string): void {
    const game = games.get(roomId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.isOnline = false;
      game.lastActivity = Date.now();
    }
  }

  static setPlayerOnline(roomId: string, playerId: string): void {
    const game = games.get(roomId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.isOnline = true;
      player.lastSeenAt = Date.now();
      game.lastActivity = Date.now();
    }
  }

  static reconnectPlayer(roomId: string, playerId: string): { success: boolean; gameState?: GameState; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found in this game' };
    }

    // Mark player as online
    player.isOnline = true;
    player.lastSeenAt = Date.now();
    game.lastActivity = Date.now();

    return { success: true, gameState: game };
  }

  static leaveGame(roomId: string, playerId: string): { success: boolean; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: 'Player not found' };
    }

    const leavingPlayer = game.players[playerIndex];
    
    // Remove player from game
    game.players.splice(playerIndex, 1);
    
    // If the leaving player was the host, assign new host
    if (leavingPlayer.isHost && game.players.length > 0) {
      game.players[0].isHost = true;
    }

    // If the leaving player was the current drawer, end the turn
    if (game.currentDrawer === playerId && game.status === 'playing') {
      this.endTurn(game);
    }

    // Clean up empty games
    if (game.players.length === 0) {
      games.delete(roomId);
    } else {
      game.lastActivity = Date.now();
    }

    return { success: true };
  }

  static endTurn(game: GameState): void {
    // Clear the round timer.
    this.clearGameTimer(game.roomId);

    // Reveal the word for a few seconds before moving on. Previously this
    // jumped straight to the next word-selection (or 'finished') state in
    // the same synchronous call, so there was never a moment where players
    // could see the word or who guessed it - the round just silently
    // vanished into the next phase with no feedback at all.
    game.status = 'round-end';
    game.timeRemaining = 0;
    game.lastActivity = Date.now();

    const revealTimer = setTimeout(() => {
      this.completeTurnTransition(game);
    }, this.ROUND_END_REVEAL_MS);
    gameTimers.set(`${game.roomId}-round-end`, revealTimer);
  }

  private static readonly ROUND_END_REVEAL_MS = 3000;

  private static completeTurnTransition(game: GameState): void {
    gameTimers.delete(`${game.roomId}-round-end`);

    // Check if all turns are completed
    if (game.currentTurn >= game.totalTurns) {
      // Game is finished
      game.status = 'finished';
      game.timeRemaining = 0;
      game.currentDrawer = undefined;
      game.currentWord = undefined;
      console.log(`Game ${game.roomId} finished after ${game.currentTurn} turns`);
    } else {
      // Move to next turn
      game.currentTurn++;

      // Update current round number for display, using the FIXED player
      // count from the drawingOrder snapshot taken at game start (the same
      // count totalTurns was derived from) - not a live re-filter, which
      // would make the round number drift if the online count changes
      // mid-game (e.g. round could appear to exceed settings.rounds).
      const totalDrawers = game.drawingOrder.length || 1;
      game.currentRound = Math.ceil(game.currentTurn / totalDrawers);

      // Start next turn
      this.startTurn(game);
    }

    game.lastActivity = Date.now();
    this.broadcastGameUpdate(game.roomId);
  }

  static handleTimeOut(roomId: string): { success: boolean; gameState?: GameState; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'playing') {
      return { success: false, error: 'Game not in progress' };
    }

    // Verify the round has actually expired server-side. Without this check,
    // any client (including the drawer) could call this endpoint at any
    // moment to force-skip the current turn regardless of real time left.
    if (!game.turnStartTime) {
      return { success: false, error: 'Round has not started yet' };
    }
    const elapsedMs = Date.now() - game.turnStartTime;
    const totalMs = game.settings.timePerRound * 1000;
    if (elapsedMs < totalMs) {
      return { success: false, error: 'Round has not timed out yet' };
    }

    // Clear the timer and end turn
    this.clearGameTimer(roomId);
    game.timeRemaining = 0;
    game.lastActivity = Date.now();

    // End the current turn
    this.endTurn(game);

    return { success: true, gameState: game };
  }

  static getCurrentGameState(roomId: string): { success: boolean; gameState?: GameState; error?: string } {
    const game = games.get(roomId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Update time remaining based on elapsed time for more accurate sync
    this.updateTimeRemaining(game);

    return { success: true, gameState: game };
  }

  // Room codes are user-typed (6 chars, [A-Z0-9]), so they stay short - but
  // drawn via a CSPRNG rather than Math.random(), which is not suitable for
  // anything security-relevant.
  private static readonly ROOM_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  static generateRoomId(): string {
    let roomId: string;
    do {
      roomId = Array.from({ length: 6 }, () => this.ROOM_ID_CHARS[randomInt(this.ROOM_ID_CHARS.length)]).join('');
    } while (games.has(roomId));
    return roomId;
  }

  private static generatePlayerId(): string {
    // playerId doubles as the sole bearer credential for acting as a given
    // player, so it needs to be unguessable - randomUUID() is CSPRNG-backed.
    return randomUUID();
  }

  // Timer management methods
  static startGameTimer(game: GameState): void {
    // Clear any existing timer first
    this.clearGameTimer(game.roomId);
    
    // Check periodically if time has run out
    const timer = setInterval(() => {
      // Re-fetch game from store in case it was updated
      const currentGame = games.get(game.roomId);
      if (!currentGame || currentGame.status !== 'playing') {
        this.clearGameTimer(game.roomId);
        return;
      }

      // Calculate actual time remaining based on elapsed time
      this.updateTimeRemaining(currentGame);

      // Auto-timeout when time reaches 0
      if (currentGame.timeRemaining <= 0) {
        console.log(`[Timer] Time expired for room ${game.roomId}, ending turn`);
        this.clearGameTimer(game.roomId);
        this.endTurn(currentGame);
        this.broadcastGameUpdate(game.roomId);
      }
    }, 1000); // Check every second

    gameTimers.set(game.roomId, timer);
    console.log(`[Timer] Started timer for room ${game.roomId}`);
  }

  static clearGameTimer(roomId: string): void {
    const timer = gameTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      gameTimers.delete(roomId);
    }
  }

  static updateTimeRemaining(game: GameState): void {
    // Only update if we have a start time and game is playing
    if (!game.turnStartTime || game.status !== 'playing') {
      return;
    }
    
    // Calculate based on elapsed time since turn started
    const now = Date.now();
    const elapsed = Math.floor((now - game.turnStartTime) / 1000);
    const newTimeRemaining = Math.max(0, game.settings.timePerRound - elapsed);
    
    // Update time remaining
    game.timeRemaining = newTimeRemaining;
    
    // Log for debugging (remove in production)
    if (elapsed % 10 === 0) { // Log every 10 seconds
      console.log(`[Timer] Room ${game.roomId}: ${newTimeRemaining}s remaining (elapsed: ${elapsed}s, start: ${game.turnStartTime})`);
    }
  }

  // Cleanup inactive games (call this periodically)
  static cleanupInactiveGames(): void {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, game] of games.entries()) {
      if (now - game.lastActivity > INACTIVE_THRESHOLD) {
        // Clear timer before deleting game
        this.clearGameTimer(roomId);
        games.delete(roomId);
      }
    }
  }

  // Broadcast game state update to all connected WebSocket clients
  private static broadcastGameUpdate(roomId: string): void {
    if (global.broadcastToRoom) {
      const game = games.get(roomId);
      if (game) {
        global.broadcastToRoom(roomId, {
          type: 'game_update',
          gameState: game,
        });
      }
    }
  }

}
