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
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  timestamp: number;
}

export interface GameState {
  roomId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  settings: GameSettings;
  currentRound: number;
  currentWord?: string;
  currentDrawer?: string;
  timeRemaining: number;
  drawing: DrawingStroke[];
  guesses: Array<{
    playerId: string;
    playerName: string;
    guess: string;
    timestamp: number;
    isCorrect: boolean;
  }>;
  roundScores: Record<string, number>;
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
  strokes: DrawingStroke[];
}
