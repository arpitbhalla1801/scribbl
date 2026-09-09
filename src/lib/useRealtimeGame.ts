import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, ChatMessage, DrawingUpdate } from './types';
import { GameAPI } from './gameAPI';

interface UseRealtimeGameProps {
  roomId: string;
  playerId: string;
  playerName: string;
  onGameStateUpdate?: (gameState: GameState) => void;
  onNewMessage?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
}

export function useRealtimeGame({
  roomId,
  playerId,
  playerName,
  onGameStateUpdate,
  onNewMessage,
  onError,
}: UseRealtimeGameProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const processedGuessesRef = useRef<Set<string>>(new Set());
  const lastGuessCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const activeRef = useRef(false);

  const BASE_POLL_INTERVAL_MS = 1000;
  const MAX_POLL_INTERVAL_MS = 15000;

  // Polling function to get game updates
  const pollGameState = useCallback(async () => {
    // Skip the actual request while the tab isn't visible - just reschedule.
    // The visibilitychange listener below triggers an immediate poll as soon
    // as the tab becomes visible again, so this doesn't add extra latency.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      if (activeRef.current) {
        intervalRef.current = setTimeout(pollGameState, BASE_POLL_INTERVAL_MS);
      }
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await GameAPI.getGame(roomId, playerId, controller.signal);
      if (result.aborted) {
        // Superseded by a newer poll (or the hook unmounted) - the request
        // that replaced this one already owns scheduling the next poll.
        return;
      }
      if (result.success && result.gameState) {
        const newGameState = result.gameState;
        
        // Always update the game state to ensure timer updates
        // The previous optimization was preventing timer updates
        setGameState(newGameState);
        onGameStateUpdate?.(newGameState);
        lastUpdateRef.current = newGameState.lastActivity;
        lastGuessCountRef.current = newGameState.guesses.length;

        // Convert guesses to chat messages, but only add new ones
        // IMPORTANT: Only show INCORRECT guesses in chat, hide correct ones
        setMessages(prevMessages => {
          const newMessagesMap = new Map<string, ChatMessage>();
          
          // Keep existing messages in the map (including system messages)
          prevMessages.forEach(msg => {
            newMessagesMap.set(msg.id, msg);
          });

          // Add new guesses that we haven't seen before
          // Only add INCORRECT guesses to chat
          newGameState.guesses.forEach(guess => {
            const messageId = `guess-${guess.playerId}-${guess.timestamp}`;
            if (!processedGuessesRef.current.has(messageId)) {
              processedGuessesRef.current.add(messageId);
              
              // Only add incorrect guesses to chat
              if (!guess.isCorrect) {
                const chatMessage: ChatMessage = {
                  id: messageId,
                  playerId: guess.playerId,
                  playerName: guess.playerName,
                  message: guess.guess,
                  timestamp: guess.timestamp,
                  isCorrect: false,
                };
                newMessagesMap.set(messageId, chatMessage);
              } else {
                // For correct guesses, add a system message (only once)
                const systemMessageId = `system-correct-${guess.playerId}-${guess.timestamp}`;
                if (!newMessagesMap.has(systemMessageId)) {
                  const systemMessage: ChatMessage = {
                    id: systemMessageId,
                    playerId: 'system',
                    playerName: 'System',
                    message: `${guess.playerName} guessed the word!`,
                    timestamp: guess.timestamp,
                  };
                  newMessagesMap.set(systemMessageId, systemMessage);
                }
              }
            }
          });

          // Convert map back to array and sort by timestamp
          return Array.from(newMessagesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        });
        
        if (!isConnected) {
          setIsConnected(true);
        }

        consecutiveFailuresRef.current = 0;

        // Stop polling if game is finished
        if (newGameState.status === 'finished') {
          if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
          }
          console.log('Game finished, stopping polling');
          return;
        }
      } else if (result.error) {
        onError?.(result.error);
        consecutiveFailuresRef.current++;
      }
    } catch (error) {
      console.error('Error polling game state:', error);
      onError?.('Connection error');
      consecutiveFailuresRef.current++;
    }

    if (activeRef.current) {
      // Back off after consecutive failures instead of hammering the server
      // at a fixed rate during an outage; reset to the base interval as soon
      // as a poll succeeds.
      const delay = consecutiveFailuresRef.current > 0
        ? Math.min(BASE_POLL_INTERVAL_MS * 2 ** consecutiveFailuresRef.current, MAX_POLL_INTERVAL_MS)
        : BASE_POLL_INTERVAL_MS;
      intervalRef.current = setTimeout(pollGameState, delay);
    }
  }, [roomId, playerId, isConnected, onGameStateUpdate, onError]);

  // Start polling when component mounts
  useEffect(() => {
    if (!roomId || !playerId) return;

    // Reset processed guesses when room changes
    processedGuessesRef.current.clear();
    lastGuessCountRef.current = 0;
    consecutiveFailuresRef.current = 0;
    activeRef.current = true;

    // Initial fetch; pollGameState schedules each subsequent poll itself.
    pollGameState();

    // Poll immediately when the tab becomes visible again, instead of
    // waiting out whatever delay was already scheduled while it was hidden.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeRef.current) {
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
        }
        pollGameState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activeRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, playerId]); // Only re-run when roomId or playerId changes

  // Actions
  const sendDrawingUpdate = async (update: DrawingUpdate) => {
    try {
      const result = await GameAPI.updateDrawing(roomId, update);
      if (result.success && result.gameState) {
        setGameState(result.gameState);
        onGameStateUpdate?.(result.gameState);
      }
    } catch (error) {
      console.error('Error sending drawing update:', error);
    }
  };

  // Accepts optional timeLeft for time-based scoring
  const submitGuess = async (guess: string) => {
    try {
      const result = await GameAPI.submitGuess(roomId, playerId, guess);
      if (result.success && result.gameState) {
        // Update game state immediately for responsiveness
        setGameState(result.gameState);
        onGameStateUpdate?.(result.gameState);
        lastUpdateRef.current = result.gameState.lastActivity;
        lastGuessCountRef.current = result.gameState.guesses.length;
        
        // Messages will be added by pollGameState on next poll
        // This prevents duplicates and keeps everything synchronized
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
    }
  };

  const startGame = async () => {
    try {
      const result = await GameAPI.startGame(roomId, playerId);
      if (result.success && result.gameState) {
        setGameState(result.gameState);
        onGameStateUpdate?.(result.gameState);
      } else if (result.error) {
        onError?.(result.error);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      onError?.('Failed to start game');
    }
  };

  const handleRoundTimeout = async () => {
    try {
      const result = await GameAPI.handleTimeOut(roomId, playerId);
      if (result.success && result.gameState) {
        setGameState(result.gameState);
        onGameStateUpdate?.(result.gameState);
      }
    } catch (error) {
      console.error('Error handling timeout:', error);
    }
  };

  const sendChatMessage = async (message: string) => {
    // For now, treat chat messages as guesses if in game
    if (gameState?.status === 'playing') {
      await submitGuess(message);
    } else {
      // Add as regular chat message
      const chatMessage: ChatMessage = {
        id: `chat-${playerId}-${Date.now()}`,
        playerId,
        playerName,
        message,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, chatMessage]);
      onNewMessage?.(chatMessage);
    }
  };

  const leaveRoom = async () => {
    try {
      await GameAPI.leaveGame(roomId, playerId);
      activeRef.current = false;
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      abortControllerRef.current?.abort();
      setIsConnected(false);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  };

  return {
    isConnected,
    gameState,
    messages,
    sendDrawingUpdate,
    submitGuess,
    startGame,
    sendChatMessage,
    handleRoundTimeout,
    leaveRoom,
  };
}
