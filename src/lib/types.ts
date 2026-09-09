import { TLStoreSnapshot } from 'tldraw';

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
}

// Tldraw snapshot data
export interface TldrawSnapshot {
  snapshot: TLStoreSnapshot; // TLStoreSnapshot from tldraw
  lastUpdatedBy: string;
  timestamp: number;
}

export interface GameState {
  roomId: string;
  status: 'waiting' | 'playing' | 'finished' | 'word-selection';
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
  tldrawSnapshot?: TldrawSnapshot;
  guesses: Array<{
    playerId: string;
    playerName: string;
    guess: string;
    timestamp: number;
    isCorrect: boolean;
  }>;
  roundScores: Record<string, number>;
  drawingOrder: string[]; // Order in which players will draw
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

export interface DrawingUpdate {
  playerId: string;
  type: 'tldraw_snapshot';
  tldrawSnapshot: TLStoreSnapshot;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isCorrect?: boolean;
}
