"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { GameState, ChatMessage, DrawingUpdate } from "@/lib/types";
import { useRealtimeGame } from "@/lib/useRealtimeGame";
import Canvas from "@/components/Canvas";
import ChatBox from "@/components/ChatBox";
import PlayerList from "@/components/PlayerList";
import WordHint from "@/components/WordHint";
import GameHeader from "@/components/GameHeader";

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "Guest";
  const playerId = searchParams.get("playerId") || "";

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const welcomeMessageSent = useRef<string | null>(null);

  // Real-time game connection using polling
  const {
    isConnected,
    gameState: realtimeGameState,
    messages: realtimeMessages,
    sendDrawingUpdate,
    submitGuess,
    startGame,
    sendChatMessage,
    handleRoundTimeout,
    leaveRoom,
  } = useRealtimeGame({
    roomId,
    playerId,
    playerName,
    onGameStateUpdate: (newGameState) => {
      setGameState(newGameState);
      setConnectionStatus('connected');
    },
    onNewMessage: (message) => {
      setMessages(prev => [...prev, message]);
    },
    onError: (error) => {
      console.error('Game error:', error);
      setConnectionStatus('error');
    },
  });

  // Update local state when realtime state changes
  useEffect(() => {
    if (realtimeGameState) {
      setGameState(realtimeGameState);
    }
  }, [realtimeGameState]);

  useEffect(() => {
    if (realtimeMessages) {
      setMessages(realtimeMessages);
    }
  }, [realtimeMessages]);

  useEffect(() => {
    if (isConnected && connectionStatus === 'connecting') {
      setConnectionStatus('connected');
    }
  }, [isConnected, connectionStatus]);

  useEffect(() => {
    // Add welcome message once when connected
    if (gameState && welcomeMessageSent.current !== roomId) {
      const welcomeMessage: ChatMessage = {
        id: `system-welcome-${Date.now()}`,
        playerId: 'system',
        playerName: 'System',
        message: `Welcome to room ${roomId}!`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, welcomeMessage]);
      welcomeMessageSent.current = roomId;
    }
  }, [gameState, roomId]);

  // Redirect if no playerId (should come from join/create flow)
  useEffect(() => {
    if (!playerId) {
      router.push(`/join?room=${roomId}`);
    }
  }, [playerId, roomId, router]);

  const addSystemMessage = (text: string) => {
    const systemMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      message: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const handleSendMessage = (message: string) => {
    // For guesses, use the submitGuess function
    if (gameState?.status === 'playing' && !isCurrentPlayerDrawer()) {
      submitGuess(message);
    } else {
      // For regular chat, use sendChatMessage
      sendChatMessage(message);
    }
  };

  const handleDrawingChange = (imageData: string, update: DrawingUpdate) => {
    // Only send drawing updates if the current player is the drawer
    if (isCurrentPlayerDrawer()) {
      const updateWithPlayerId = { ...update, playerId };
      sendDrawingUpdate(updateWithPlayerId);
    }
  };

  const handleTimeEnd = () => {
    handleRoundTimeout();
  };

  const handleStartGame = () => {
    startGame();
  };

  const isCurrentPlayerDrawer = (): boolean => {
    return gameState?.currentDrawer === playerId;
  };

  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;

  if (connectionStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">Connecting to game...</div>
          <div className="animate-spin h-10 w-10 border-4 border-primary rounded-full border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold text-red-600">Connection Error</div>
          <div className="mb-4 text-gray-600">Unable to connect to the game</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">Loading game...</div>
        </div>
      </div>
    );
  }

  // Show final scores if game is finished
  if (gameState.status === 'finished') {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    return (
      <div className="container mx-auto p-4 max-w-4xl min-h-screen flex flex-col items-center justify-center">
        <div className="card p-8 text-center max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6">Game Finished!</h1>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Final Scores</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">#{index + 1}</span>
                    <span className={`font-medium ${player.id === playerId ? 'text-blue-600' : ''}`}>
                      {player.name}
                      {player.id === playerId && ' (You)'}
                    </span>
                  </div>
                  <span className="text-lg font-bold">{player.score} pts</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting room if game hasn't started
  if (gameState.status === 'waiting') {
    return (
      <div className="container mx-auto p-4 max-w-4xl min-h-screen flex flex-col items-center justify-center">
        <div className="card p-8 text-center max-w-md w-full">
          <h1 className="text-3xl font-bold mb-6">Room {roomId}</h1>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Players ({gameState.players.length}/8)</h2>
            <div className="space-y-2">
              {gameState.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                  <span>{player.name}</span>
                  {player.isHost && <span className="text-sm text-blue-600 font-medium">Host</span>}
                </div>
              ))}
            </div>
          </div>
          {isHost && gameState.players.length >= 2 && (
            <button
              onClick={handleStartGame}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              Start Game
            </button>
          )}
          {!isHost && (
            <div className="text-gray-600">Waiting for host to start the game...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen flex flex-col">
      <div className="mb-4">
        <GameHeader
          roomId={roomId}
          roundNumber={gameState.currentRound}
          totalRounds={gameState.settings.rounds}
          timeRemaining={gameState.timeRemaining}
          onTimeEnd={handleTimeEnd}
          currentTurn={gameState.currentTurn}
          totalTurns={gameState.totalTurns}
        />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col">
          <div className="card flex-1 flex flex-col">
            <div className="p-3 border-b border-card-border font-medium">
              Drawing Board
              {isCurrentPlayerDrawer() && (
                <span className="ml-2 text-sm text-green-600">(You are drawing)</span>
              )}
            </div>
            <div className="flex-1 p-2 min-h-[300px]">
              <Canvas 
                isDrawing={isCurrentPlayerDrawer()} 
                onDrawingChange={handleDrawingChange}
                gameState={gameState}
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-center py-4 card">
            <WordHint 
              word={gameState.currentWord || ""} 
              reveal={isCurrentPlayerDrawer()} 
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <PlayerList 
            players={gameState.players.map(p => ({
              id: p.id,
              username: p.name,
              score: p.score,
              isDrawing: p.id === gameState.currentDrawer,
            }))}
            currentPlayerId={playerId}
          />
          
          <div className="flex-1 min-h-[300px]">
            <ChatBox
              username={playerName}
              onMessageSend={handleSendMessage}
              messages={messages.map(m => ({
                id: parseInt(m.id.split('-')[1]) || Date.now(),
                username: m.playerName,
                text: m.message,
                isCorrect: m.isCorrect,
              }))}
              isGuessing={!isCurrentPlayerDrawer() && gameState.status === 'playing'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}