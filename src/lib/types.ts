import { TLStoreSnapshot } from 'tldraw';

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isOnline: boolean;
}

export interface GameSettings {
  rounds: number;
  timePerRound: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
}

// Tldraw snapshot data
export interface TldrawSnapshot {
  snapshot: TLStoreSnapshot; // TLStoreSnapshot from tldraw
  lastUpdatedBy: string;
  timestamp: number;
}

export interface GameState {
  roomId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  settings: GameSettings;
  currentRound: number;
  currentTurn: number; // Track which turn within the round
  totalTurns: number; // Total turns needed (players * rounds)
  currentWord?: string;
  currentDrawer?: string;
  timeRemaining: number;
  turnStartTime?: number; // Server timestamp when current turn started
  drawing: DrawingStroke[]; // Legacy drawing system (kept for compatibility)
  tldrawSnapshot?: TldrawSnapshot; // New tldraw-based drawing system
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
  timeLeft?: number; // seconds left on client timer
}

export interface DrawingUpdate {
  playerId: string;
  type: 'stroke' | 'clear' | 'tldraw_snapshot';
  stroke?: DrawingStroke;
  tldrawSnapshot?: TLStoreSnapshot; // TLStoreSnapshot from tldraw
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  isCorrect?: boolean;
}
