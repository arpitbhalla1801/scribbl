import { GameState, CreateGameRequest, DrawingUpdate } from './types';

export class GameAPI {
  static async createGame(request: CreateGameRequest): Promise<{
    success: boolean;
    roomId?: string;
    playerId?: string;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async joinGame(roomId: string, playerName: string): Promise<{
    success: boolean;
    playerId?: string;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName }),
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async getGame(roomId: string, playerId?: string): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const url = playerId 
        ? `/api/games/${roomId}?playerId=${playerId}`
        : `/api/games/${roomId}`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async startGame(roomId: string, playerId: string): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async submitGuess(roomId: string, playerId: string, guess: string): Promise<{
    success: boolean;
    isCorrect?: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId, guess }),
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async updateDrawing(roomId: string, update: DrawingUpdate): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async leaveGame(roomId: string, playerId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}?playerId=${playerId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async reconnectPlayer(roomId: string, playerId: string): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/reconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId }),
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async selectWord(roomId: string, playerId: string, wordIndex: number): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/select-word`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId, wordIndex }),
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  static async handleTimeOut(roomId: string): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/timeout`, {
        method: 'POST',
      });

      const data = await response.json();
      return data;
    } catch {
      return {
        success: false,
        error: 'Network error',
      };
    }
  }
}
