import { useEffect, useRef, useState } from 'react';
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

  // Polling function to get game updates
  const pollGameState = async () => {
    try {
      const result = await GameAPI.getGame(roomId);
      if (result.success && result.gameState) {
        const newGameState = result.gameState;
        
        // Only update if the game state has actually changed
        if (newGameState.lastActivity > lastUpdateRef.current) {
          setGameState(newGameState);
          onGameStateUpdate?.(newGameState);
          lastUpdateRef.current = newGameState.lastActivity;

          // Convert guesses to chat messages
          const newMessages: ChatMessage[] = newGameState.guesses.map(guess => ({
            id: `guess-${guess.playerId}-${guess.timestamp}`,
            playerId: guess.playerId,
            playerName: guess.playerName,
            message: guess.guess,
            timestamp: guess.timestamp,
            isCorrect: guess.isCorrect,
          }));

          setMessages(newMessages);
        }
        
        if (!isConnected) {
          setIsConnected(true);
        }

        // Stop polling if game is finished
        if (newGameState.status === 'finished' && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          console.log('Game finished, stopping polling');
        }
      } else if (result.error) {
        onError?.(result.error);
      }
    } catch (error) {
      console.error('Error polling game state:', error);
      onError?.('Connection error');
    }
  };

  // Start polling when component mounts
  useEffect(() => {
    if (roomId && playerId) {
      // Initial fetch
      pollGameState();
      
      // Set up polling interval
      intervalRef.current = setInterval(pollGameState, 1000); // Poll every second
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [roomId, playerId]);

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
  const submitGuess = async (guess: string, timeLeft?: number) => {
    try {
      const result = await GameAPI.submitGuess(roomId, playerId, guess, timeLeft);
      if (result.success && result.gameState) {
        setGameState(result.gameState);
        onGameStateUpdate?.(result.gameState);
        // Add the guess as a message immediately
        const message: ChatMessage = {
          id: `guess-${playerId}-${Date.now()}`,
          playerId,
          playerName,
          message: guess,
          timestamp: Date.now(),
          isCorrect: result.isCorrect,
        };
        setMessages(prev => [...prev, message]);
        onNewMessage?.(message);
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
      const result = await GameAPI.handleTimeOut(roomId);
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
