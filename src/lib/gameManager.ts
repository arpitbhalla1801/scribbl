import { randomInt, randomUUID } from 'crypto';
import type { GameState, Player, GameSettings } from './types';
import { getRandomWords } from './words.ts';
import { filterProfanity } from './validation.ts';
import { createStore, type GameStore } from './store.ts';
import { logger } from './logger.ts';

declare global {
  var gameStore: GameStore | undefined;
  var gameTimersStore: Map<string, NodeJS.Timeout> | undefined;
}

// Use global to persist across HMR reloads in development
const store: GameStore = (global.gameStore ??= createStore());

// One timer per room, always aimed at the room's next deadline. In-process,
// so this only works with a single server instance.
const timers: Map<string, NodeJS.Timeout> = (global.gameTimersStore ??= new Map());

// A player is considered offline once this long has passed since their last
// request. The live client polls every 1s, so this leaves generous headroom
// for network jitter without letting a truly-gone player linger too long.
const HEARTBEAT_TIMEOUT_MS = 5000;
const WORD_SELECTION_MS = 10000;
const ROUND_END_REVEAL_MS = 3000;

// A one-edit-away guess still counts, but is worth less than nailing the
// exact word.
const TYPO_SCORE_MULTIPLIER = 0.8;

// Room codes are user-typed (6 chars, [A-Z0-9]), so they stay short - but
// drawn via a CSPRNG rather than Math.random(), which is not suitable for
// anything security-relevant.
const ROOM_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const NOT_FOUND = { success: false, error: 'Game not found' };

// True if `a` can become `b` with at most one insertion, deletion, or
// substitution. O(n) rather than full Levenshtein DP since we only ever need
// to know "is it within 1", not the exact distance.
export function isOneEditAway(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edited = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i++;
      j++;
      continue;
    }
    if (edited) return false;
    edited = true;
    if (shorter.length === longer.length) i++; // substitution
    j++; // insertion/deletion in the longer string
  }
  return true;
}

export class GameManager {
  // Runs a state change atomically, then re-arms the room's timer from the
  // saved state. fn is re-run on write conflicts, so it must only touch `g`.
  private static async run<T extends { success: boolean; error?: string }>(
    roomId: string,
    fn: (g: GameState) => T
  ): Promise<T> {
    let saved: GameState | undefined;
    const result = await store.atomicUpdate(roomId, (g) => {
      saved = g;
      return fn(g);
    });
    if (!result || !saved) return NOT_FOUND as T;
    this.arm(saved);
    return result;
  }

  static async createGame(hostName: string, settings: GameSettings): Promise<GameState> {
    const host: Player = {
      id: this.generatePlayerId(),
      name: hostName,
      score: 0,
      isHost: true,
      isOnline: true,
      lastSeenAt: Date.now(),
    };

    for (;;) {
      const roomId = Array.from({ length: 6 }, () => ROOM_ID_CHARS[randomInt(ROOM_ID_CHARS.length)]).join('');
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
        voteKicks: {},
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      if (await store.create(gameState)) return gameState;
    }
  }

  static async getGame(roomId: string, callerId?: string): Promise<GameState | null> {
    // Record a heartbeat for whichever player made this request, mark anyone
    // who hasn't been seen recently as offline, and move the game on if a
    // deadline has passed. The live client polls this endpoint every second
    // for every connected player, so it doubles as the presence signal - a
    // closed tab simply stops calling it.
    const result = await this.run<{ success: boolean; gameState?: GameState }>(roomId, (g) => {
      this.updatePresence(g, callerId);
      this.advance(g);
      this.updateTimeRemaining(g);
      return { success: true, gameState: g };
    });
    return result.gameState ?? null;
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

  static joinGame(roomId: string, playerName: string) {
    return this.run<{ success: boolean; player?: Player; error?: string }>(roomId, (game) => {
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
      return { success: true, player };
    });
  }

  static startGame(roomId: string, playerId: string) {
    return this.run<{ success: boolean; error?: string }>(roomId, (game) => {
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

      // Set up drawing order: everyone who joined the room draws once per
      // round. Deliberately NOT filtered by isOnline here - a player who just
      // joined may not have had their first poll land yet (isOnline is a
      // heartbeat that only refreshes on request), and filtering them out at
      // this exact moment would wrongly drop them from the whole game's turn
      // rotation before they ever got a chance. isOnline filtering still
      // applies turn-by-turn in startTurn, which is what actually matters:
      // skipping someone who goes AWOL mid-game.
      game.drawingOrder = game.players.map(p => p.id);
      game.totalTurns = game.players.length * game.settings.rounds;

      this.startTurn(game);
      return { success: true };
    });
  }

  private static startTurn(game: GameState): void {
    // Reset turn state
    game.guesses = [];
    game.roundScores = {};
    game.voteKicks = {};
    game.timeRemaining = game.settings.timePerRound;
    game.turnStartTime = undefined; // Don't start timer until word is selected
    game.roundEndDeadline = undefined;

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
    game.wordChoices = getRandomWords(game.settings.difficulty || 'medium', 3);
    game.currentWord = undefined; // No word selected yet
    game.status = 'word-selection';
    game.wordSelectionDeadline = Date.now() + WORD_SELECTION_MS;
    game.lastActivity = Date.now();
  }

  static selectWord(roomId: string, playerId: string, wordIndex: number) {
    return this.run<{ success: boolean; gameState?: GameState; error?: string }>(roomId, (game) => {
      if (game.status !== 'word-selection') {
        return { success: false, error: 'Not in word selection phase' };
      }

      if (game.currentDrawer !== playerId) {
        return { success: false, error: 'Only the drawer can select a word' };
      }

      if (!game.wordChoices || wordIndex < 0 || wordIndex >= game.wordChoices.length) {
        return { success: false, error: 'Invalid word selection' };
      }

      this.applyWord(game, wordIndex);
      return { success: true, gameState: game };
    });
  }

  private static applyWord(game: GameState, wordIndex: number): void {
    game.currentWord = game.wordChoices![wordIndex];
    game.wordChoices = undefined; // Clear choices
    game.status = 'playing';
    game.turnStartTime = Date.now(); // Start timer now
    game.wordSelectionDeadline = undefined;
    game.lastActivity = Date.now();
  }

  static submitGuess(roomId: string, playerId: string, guess: string) {
    return this.run<{
      success: boolean;
      isCorrect?: boolean;
      gameState?: GameState;
      error?: string;
    }>(roomId, (game) => {
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

      // Accept guesses that are a single edit away from the word (typos like
      // "firetrucck"), not just exact matches - but worth fewer points (see
      // TYPO_SCORE_MULTIPLIER below).
      const normalizedGuess = guess.toLowerCase().trim();
      const normalizedWord = game.currentWord?.toLowerCase().trim();
      const isExactMatch = !!normalizedWord && normalizedGuess === normalizedWord;
      const isCorrect = isExactMatch || (!!normalizedWord && isOneEditAway(normalizedGuess, normalizedWord));

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

        // Points: base 100 + up to 100 bonus for speed (linear), discounted
        // for a typo'd (one-edit-away) guess so it's always worth less than
        // getting the word exactly right.
        const maxBonus = 100;
        const totalTime = game.settings.timePerRound;
        const bonus = Math.round((timeRemaining / totalTime) * maxBonus);
        const fullPoints = 100 + bonus;
        const points = isExactMatch ? fullPoints : Math.round(fullPoints * TYPO_SCORE_MULTIPLIER);

        player.score += points;

        // Add to round scores
        if (!game.roundScores[playerId]) {
          game.roundScores[playerId] = 0;
        }
        game.roundScores[playerId] += points;

        // Award points to drawer too (half of the full points, regardless of
        // the guesser's typo discount - the drawer drew it correctly either
        // way, so their score shouldn't be docked for the guesser's typo).
        const drawer = game.players.find(p => p.id === game.currentDrawer);
        if (drawer) {
          const drawerPoints = Math.floor(fullPoints * 0.5);
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
      return { success: true, isCorrect, gameState: game };
    });
  }

  static reconnectPlayer(roomId: string, playerId: string) {
    return this.run<{ success: boolean; gameState?: GameState; error?: string }>(roomId, (game) => {
      const player = game.players.find(p => p.id === playerId);
      if (!player) {
        return { success: false, error: 'Player not found in this game' };
      }

      // Mark player as online
      player.isOnline = true;
      player.lastSeenAt = Date.now();
      game.lastActivity = Date.now();

      return { success: true, gameState: game };
    });
  }

  static async leaveGame(roomId: string, playerId: string): Promise<{ success: boolean; error?: string }> {
    let empty = false;
    const result = await this.run<{ success: boolean; error?: string }>(roomId, (game) => {
      if (!game.players.some(p => p.id === playerId)) {
        return { success: false, error: 'Player not found' };
      }

      this.removePlayer(game, playerId);
      empty = game.players.length === 0;
      game.lastActivity = Date.now();
      return { success: true };
    });

    // Clean up empty games
    if (empty) {
      this.disarm(roomId);
      await store.delete(roomId);
    }
    return result;
  }

  // Shared by leaveGame and voteKick: drops a player, reassigns host, and
  // ends the turn if they were mid-draw. Caller is responsible for checking
  // the player exists first.
  private static removePlayer(game: GameState, playerId: string): void {
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const removedPlayer = game.players[playerIndex];
    game.players.splice(playerIndex, 1);

    if (removedPlayer.isHost && game.players.length > 0) {
      game.players[0].isHost = true;
    }

    if (game.currentDrawer === playerId && game.status === 'playing') {
      this.endTurn(game);
    }

    delete game.voteKicks[playerId];
  }

  // #46: any player can vote to kick another. A strict majority of the
  // *other* online players (so a 2-player room kicks on a single vote,
  // matching what "majority" means with only one other voter) removes the
  // target immediately, same as if they'd left.
  static voteKick(roomId: string, voterId: string, targetId: string) {
    return this.run<{ success: boolean; kicked?: boolean; gameState?: GameState; error?: string }>(
      roomId,
      (game) => {
        if (voterId === targetId) {
          return { success: false, error: 'Can’t vote to kick yourself' };
        }
        if (!game.players.some(p => p.id === voterId)) {
          return { success: false, error: 'Player not found' };
        }
        if (!game.players.some(p => p.id === targetId)) {
          return { success: false, error: 'Target not in this game' };
        }

        const votes = game.voteKicks[targetId] ?? (game.voteKicks[targetId] = []);
        if (votes.includes(voterId)) {
          return { success: false, error: 'Already voted to kick this player' };
        }
        votes.push(voterId);

        const eligibleVoters = game.players.filter(p => p.id !== targetId && p.isOnline).length;
        const threshold = Math.floor(eligibleVoters / 2) + 1;
        const kicked = votes.length >= threshold;
        if (kicked) this.removePlayer(game, targetId);

        game.lastActivity = Date.now();
        return { success: true, kicked, gameState: game };
      }
    );
  }

  // Reveal the word for a few seconds before moving on, so players can see
  // the word and who guessed it.
  private static endTurn(game: GameState): void {
    game.status = 'round-end';
    game.timeRemaining = 0;
    game.roundEndDeadline = Date.now() + ROUND_END_REVEAL_MS;
    game.lastActivity = Date.now();
  }

  private static completeTurnTransition(game: GameState): void {
    // Check if all turns are completed
    if (game.currentTurn >= game.totalTurns) {
      // Game is finished
      game.status = 'finished';
      game.timeRemaining = 0;
      game.currentDrawer = undefined;
      game.currentWord = undefined;
      game.roundEndDeadline = undefined;
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

      this.startTurn(game);
    }

    game.lastActivity = Date.now();
  }

  // Moves the game to its next phase if the current phase's deadline has
  // passed. The deadlines stored on the game are the source of truth; timers
  // and polls both just call this.
  private static advance(game: GameState): void {
    const at = this.nextDeadline(game);
    if (at === null || Date.now() < at) return;

    if (game.status === 'word-selection') {
      this.applyWord(game, 0); // drawer didn't choose in time
    } else if (game.status === 'playing') {
      this.endTurn(game);
    } else if (game.status === 'round-end') {
      this.completeTurnTransition(game);
    }
  }

  private static nextDeadline(game: GameState): number | null {
    switch (game.status) {
      case 'word-selection':
        return game.wordSelectionDeadline ?? null;
      case 'playing':
        return game.turnStartTime ? game.turnStartTime + game.settings.timePerRound * 1000 : null;
      case 'round-end':
        return game.roundEndDeadline ?? null;
      default:
        return null;
    }
  }

  private static arm(game: GameState): void {
    this.disarm(game.roomId);
    const at = this.nextDeadline(game);
    if (at === null) return;

    const timer = setTimeout(() => {
      timers.delete(game.roomId);
      this.run(game.roomId, (g) => {
        this.advance(g);
        return { success: true };
      }).catch((err) => logger.error('Timer failed', { roomId: game.roomId, error: err }));
    }, Math.max(0, at - Date.now()) + 50);
    timers.set(game.roomId, timer);
  }

  private static disarm(roomId: string): void {
    const timer = timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      timers.delete(roomId);
    }
  }

  static handleTimeOut(roomId: string) {
    return this.run<{ success: boolean; gameState?: GameState; error?: string }>(roomId, (game) => {
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

      this.endTurn(game);
      return { success: true, gameState: game };
    });
  }

  private static generatePlayerId(): string {
    // Deliberately NOT UUID v7 (see #41) despite that being the DB-entity
    // convention elsewhere - playerId doubles as the sole bearer credential
    // for acting as a given player, so it needs to be unguessable. v7's
    // leading timestamp bits make it more predictable than v4, which is
    // exactly wrong for something that has to work as a secret.
    // randomUUID() is CSPRNG-backed v4.
    return randomUUID();
  }

  private static updateTimeRemaining(game: GameState): void {
    // Only update if we have a start time and game is playing
    if (!game.turnStartTime || game.status !== 'playing') {
      return;
    }

    // Calculate based on elapsed time since turn started
    const elapsed = Math.floor((Date.now() - game.turnStartTime) / 1000);
    game.timeRemaining = Math.max(0, game.settings.timePerRound - elapsed);
  }
}
