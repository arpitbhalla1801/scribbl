"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { GameState } from './types';

interface UseWebSocketGameProps {
  roomId: string;
  playerId: string;
  enabled?: boolean;
}

export function useWebSocketGame({ roomId, playerId, enabled = true }: UseWebSocketGameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !roomId || !playerId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?roomId=${roomId}&playerId=${playerId}`;
      
      console.log('[WS Client] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS Client] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'game_update') {
            setGameState(message.gameState);
          } else if (message.type === 'error') {
            console.error('[WS Client] Server error:', message.message);
            setError(message.message);
          } else if (message.type === 'ping') {
            // Respond to ping
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          console.error('[WS Client] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS Client] WebSocket error:', error);
        setError('Connection error');
      };

      ws.onclose = () => {
        console.log('[WS Client] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`[WS Client] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Failed to reconnect. Please refresh the page.');
        }
      };
    } catch (err) {
      console.error('[WS Client] Connection error:', err);
      setError('Failed to establish connection');
    }
  }, [roomId, playerId, enabled]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  // Manual refresh function (fallback to HTTP if needed)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${roomId}?playerId=${playerId}`);
      if (response.ok) {
        const data = await response.json();
        setGameState(data.gameState);
        setError(null);
      } else {
        throw new Error('Failed to fetch game state');
      }
    } catch (err) {
      console.error('[WS Client] Refresh error:', err);
      setError('Failed to refresh game state');
    }
  }, [roomId, playerId]);

  return {
    gameState,
    isConnected,
    error,
    refresh,
    reconnect: connect,
  };
}
