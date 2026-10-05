export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isOnline: boolean;
  lastSeenAt: number; // Server timestamp of the player's last request (heartbeat)
}

export interface GameSettings {
  rounds: number;
  timePerRound: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  customWords?: string[]; // If set (>=3 words), used instead of the built-in word lists
}

export interface GameState {
  roomId: string;
  status: 'waiting' | 'playing' | 'finished' | 'word-selection' | 'round-end';
  players: Player[];
  settings: GameSettings;
  currentRound: number;
  currentTurn: number; // Track which turn within the round
  totalTurns: number; // Total turns needed (players * rounds)
  currentWord?: string;
  wordChoices?: string[]; // 3 word options for drawer to choose from
  wordSelectionDeadline?: number; // Timestamp when word selection times out
  currentDrawer?: string;
  timeRemaining: number;
  turnStartTime?: number; // Server timestamp when current turn started
  roundEndDeadline?: number; // Timestamp when the round-end reveal moves on
  guesses: Array<{
    playerId: string;
    playerName: string;
    guess: string;
    timestamp: number;
    isCorrect: boolean;
  }>;
  roundScores: Record<string, number>;
  drawingOrder: string[]; // Order in which players will draw
  voteKicks: Record<string, string[]>; // targetPlayerId -> voter playerIds, reset each turn
  createdAt: number;
  lastActivity: number;
}

export interface CreateGameRequest {
  playerName: string;
  settings: GameSettings;
}

export interface JoinGameRequest {
  playerName: string;
  roomId: string;
}

export interface GuessRequest {
  playerId: string;
  guess: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isCorrect?: boolean;
}
