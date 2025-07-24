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
  const roomId = (params?.roomId ?? "") as string;
  const playerName = searchParams?.get("name") || "Guest";
  const playerId = searchParams?.get("playerId") || "";

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
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-gray-700 rounded-full border-t-black dark:border-t-white mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Connecting...</div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center card p-6 max-w-sm mx-4">
          <div className="text-red-500 dark:text-red-400 mb-4">Connection failed</div>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full btn-primary"
            >
              Retry
            </button>
            <button 
              onClick={() => router.push('/')} 
              className="w-full btn-secondary"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 dark:border-gray-700 rounded-full border-t-black dark:border-t-white mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  // Show final scores if game is finished
  if (gameState.status === 'finished') {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    return (
      <div className="container mx-auto p-4 max-w-4xl min-h-screen flex flex-col items-center justify-center">
        <div className="card p-8 w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-primary">🎉 Game Finished!</h1>
            <p className="text-secondary text-lg">Thanks for playing in room {roomId}</p>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-center text-primary">🏆 Final Scores</h2>
            <div className="space-y-4">
              {sortedPlayers.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-2 border-yellow-200 dark:border-yellow-700' 
                      : index === 1 
                        ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/30 dark:to-slate-800/30 border-2 border-gray-200 dark:border-gray-600' 
                        : index === 2 
                          ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-200 dark:border-orange-700' 
                          : 'bg-gray-50 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full font-bold text-lg ${
                      index === 0 
                        ? 'bg-yellow-400 text-yellow-900 shadow-lg' 
                        : index === 1 
                          ? 'bg-gray-300 text-gray-700 shadow-md' 
                          : index === 2 
                            ? 'bg-orange-300 text-orange-900 shadow-md' 
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div>
                      <div className={`font-bold text-lg ${
                        player.id === playerId ? 'text-primary' : 'text-primary'
                      }`}>
                        {player.name}
                        {player.id === playerId && (
                          <span className="ml-2 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </div>
                      {index === 0 && (
                        <div className="text-sm text-secondary font-medium">Winner! 🎊</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{player.score}</div>
                    <div className="text-sm text-secondary">points</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => router.push('/')}
              className="w-full btn-primary text-lg py-4"
            >
              🎮 Play Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full btn-secondary text-lg py-3"
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting room if game hasn't started
  if (gameState.status === 'waiting') {
    return (
      <div className="container mx-auto p-4 max-w-md min-h-screen flex flex-col items-center justify-center">
        <div className="card p-8 w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-light mb-4 text-gray-900 dark:text-white">Room {roomId}</h1>
            <p className="text-gray-500 dark:text-gray-500">Waiting for players...</p>
          </div>
          
          <div className="mb-8">
            <div className="text-sm text-gray-500 dark:text-gray-500 mb-4 text-center">
              {gameState.players.length}/8 players
            </div>
            
            <div className="space-y-2">
              {gameState.players.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-md ${
                    player.id === playerId 
                      ? 'bg-gray-100 dark:bg-gray-800' 
                      : 'bg-gray-50 dark:bg-gray-900'
                  }`}
                >
                  <span className="text-sm">{player.name}</span>
                  {player.isHost && (
                    <span className="text-xs text-gray-500 dark:text-gray-500">Host</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            {isHost && gameState.players.length >= 2 ? (
              <button
                onClick={handleStartGame}
                className="w-full btn-primary"
              >
                Start Game
              </button>
            ) : isHost ? (
              <div className="w-full py-3 text-center text-gray-500 dark:text-gray-500 text-sm">
                Need at least 2 players
              </div>
            ) : (
              <div className="w-full py-3 text-center text-gray-500 dark:text-gray-500 text-sm">
                Waiting for host...
              </div>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="w-full btn-secondary"
            >
              Leave
            </button>
          </div>
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 grid-responsive">
        {/* Drawing Board */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="card flex-1 flex flex-col min-h-[400px]">
            <div className="p-3 border-b border-card-border text-sm text-gray-600 dark:text-gray-400">
              {isCurrentPlayerDrawer() ? "Your turn to draw" : "Guess what's being drawn"}
            </div>
            <div className="flex-1 p-2">
              <Canvas 
                isDrawing={isCurrentPlayerDrawer()} 
                onDrawingChange={handleDrawingChange}
                gameState={gameState}
              />
            </div>
          </div>
          
          {/* Word Hint */}
          <div className="mt-4 card">
            <WordHint 
              word={gameState.currentWord || ""} 
              reveal={isCurrentPlayerDrawer()} 
            />
          </div>
        </div>
        
        {/* Sidebar */}
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