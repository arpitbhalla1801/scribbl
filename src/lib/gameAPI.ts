import { GameState, CreateGameRequest } from './types';

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

  static async getGame(roomId: string, playerId?: string, signal?: AbortSignal): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
    aborted?: boolean;
  }> {
    try {
      const url = playerId
        ? `/api/games/${roomId}?playerId=${playerId}`
        : `/api/games/${roomId}`;
      const response = await fetch(url, { signal });
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { success: false, aborted: true };
      }
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

  static async handleTimeOut(roomId: string, playerId: string): Promise<{
    success: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/timeout`, {
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

  static async voteKick(roomId: string, playerId: string, targetPlayerId: string): Promise<{
    success: boolean;
    kicked?: boolean;
    gameState?: GameState;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/vote-kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, targetPlayerId }),
      });
      return await response.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }

  static async report(roomId: string, playerId: string, targetPlayerId: string, reason: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/games/${roomId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, targetPlayerId, reason }),
      });
      return await response.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }

  static async mutedPlayerIds(roomId: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/games/${roomId}/muted-players`);
      const data = await response.json();
      return data.mutedPlayerIds ?? [];
    } catch {
      return [];
    }
  }

  static async setUserRelation(
    roomId: string,
    targetPlayerId: string,
    targetName: string,
    type: 'block' | 'mute'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/users/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, targetPlayerId, targetName, type }),
      });
      return await response.json();
    } catch {
      return { success: false, error: 'Network error' };
    }
  }
}
