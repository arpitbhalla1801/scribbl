"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ChatMessage } from "@/lib/types";
import { useRealtimeGame } from "@/lib/useRealtimeGame";
import { GameAPI } from "@/lib/gameAPI";
import TldrawCanvas from "@/components/TldrawCanvas";
import ChatBox from "@/components/ChatBox";
import PlayerList from "@/components/PlayerList";
import WordHint from "@/components/WordHint";
import GameHeader from "@/components/GameHeader";
import WordSelectionModal from "@/components/WordSelectionModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import CopyRoomCode from "@/components/CopyRoomCode";
import GameResults from "@/components/GameResults";
import { getPlayerSession } from "@/lib/sessionManager";

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = (params?.roomId ?? "") as string;
  const urlPlayerId = searchParams?.get("playerId") || "";
  const urlPlayerName = searchParams?.get("name") || "";

  // Fall back to a saved session if the URL is missing playerId (e.g. a
  // bookmarked/shared link that dropped the query string) - without this,
  // sessionManager.savePlayerSession() had nothing that ever read it back.
  const savedSession = !urlPlayerId && roomId ? getPlayerSession(roomId) : null;
  const playerId = urlPlayerId || savedSession?.playerId || "";
  const playerName = urlPlayerName || savedSession?.playerName || "Guest";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const welcomeMessageSent = useRef<string | null>(null);
  const reconnectAttempted = useRef(false);

  // Explicitly tell the server this player is (re)connecting, e.g. after a
  // page reload where the session was restored from storage above.
  useEffect(() => {
    if (playerId && roomId && !reconnectAttempted.current) {
      reconnectAttempted.current = true;
      GameAPI.reconnectPlayer(roomId, playerId).catch(err => {
        console.error('Failed to reconnect:', err);
      });
    }
  }, [playerId, roomId]);

  // Real-time game connection using optimized HTTP polling
  const {
    isConnected,
    gameState,
    submitGuess,
    startGame,
    sendChatMessage,
    handleRoundTimeout,
  } = useRealtimeGame({
    roomId,
    playerId,
    playerName,
    onGameStateUpdate: () => {
      // State is already updated by the hook
    },
    onNewMessage: (message) => {
      setMessages(prev => [...prev, message]);
    },
    onError: (error) => {
      console.error('Game error:', error);
    },
  });

  useEffect(() => {
    // Add welcome message once when connected
    if (gameState && welcomeMessageSent.current !== roomId) {
      const welcomeMessage: ChatMessage = {
        id: `system-welcome-${roomId}`,
        playerId: 'system',
        playerName: 'System',
        message: `Welcome to room ${roomId}!`,
        timestamp: Date.now(),
      };
      setMessages(prev => {
        // Check if welcome message already exists
        const exists = prev.some(m => m.id === `system-welcome-${roomId}`);
        if (exists) return prev;
        return [...prev, welcomeMessage];
      });
      welcomeMessageSent.current = roomId;
    }
  }, [gameState, roomId]);

  // Sync messages from game state
  useEffect(() => {
    if (gameState?.guesses) {
      // Never render the literal text of a correct guess - it IS the answer, and
      // broadcasting it would spoil the round for everyone still guessing. Show a
      // generic system message instead, same as the (previously unused) dedup
      // logic in useRealtimeGame's own message pipeline.
      const guessMessages: ChatMessage[] = gameState.guesses.map((guess, idx) =>
        guess.isCorrect
          ? {
              id: `system-correct-${idx}-${guess.playerId}`,
              playerId: 'system',
              playerName: 'System',
              message: `${guess.playerName} guessed the word!`,
              timestamp: guess.timestamp,
            }
          : {
              id: `guess-${idx}-${guess.playerId}`,
              playerId: guess.playerId,
              playerName: guess.playerName,
              message: guess.guess,
              timestamp: guess.timestamp,
              isCorrect: false,
            }
      );
      setMessages(prev => {
        // Keep persistent system messages (welcome, time's-up); guess-derived
        // messages (including correct-guess system messages) are regenerated
        // fresh from gameState.guesses every time, so drop the stale copies.
        const persistentSystem = prev.filter(
          m => m.id.startsWith('system-') && !m.id.startsWith('system-correct-')
        );
        return [...persistentSystem, ...guessMessages].sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  }, [gameState?.guesses]);

  // Redirect if no playerId (should come from join/create flow)
  useEffect(() => {
    if (!playerId) {
      router.push(`/join?room=${roomId}`);
    }
  }, [playerId, roomId, router]);

  const handleSendMessage = (message: string) => {
    if (gameState?.status === 'playing' && !isCurrentPlayerDrawer()) {
      submitGuess(message);
    } else {
      sendChatMessage(message);
    }
  };

  const handleTimeEnd = async () => {
    // timeRemaining also drops to 0 during the server's 'round-end' reveal
    // phase (e.g. right after a correct guess ends the round early), not
    // just on a genuine timeout - only actually call the timeout endpoint
    // while a round is in progress; the server would reject it as a no-op
    // otherwise, but there's no reason to make the call at all.
    if (gameState?.status !== 'playing') return;
    // The server holds a 'round-end' reveal phase before moving on (see
    // GameManager.endTurn), so there's no need to capture/replay the word
    // client-side here anymore - the reveal overlay below shows it.
    await handleRoundTimeout();
  };

  const handleStartGame = () => {
    startGame();
  };

  const isCurrentPlayerDrawer = (): boolean => {
    return gameState?.currentDrawer === playerId;
  };

  const handleWordSelect = async (wordIndex: number) => {
    if (!isCurrentPlayerDrawer()) return;
    
    try {
      await GameAPI.selectWord(roomId, playerId, wordIndex);
    } catch (error) {
      console.error('Error selecting word:', error);
    }
  };

  const hasPlayerGuessedCorrectly = (): boolean => {
    return gameState?.guesses.some(g => g.playerId === playerId && g.isCorrect) || false;
  };

  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;

  // Show loading while connecting
  if (!isConnected && !gameState) {
    return <LoadingSpinner message="Connecting..." />;
  }

  if (!gameState) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Show final scores if game is finished
  if (gameState.status === 'finished') {
    return <GameResults gameState={gameState} />;
  }

  // Show waiting room if game hasn't started
  if (gameState.status === 'waiting') {
    return (
      <div className="container mx-auto p-4 max-w-md min-h-screen flex flex-col items-center justify-center">
        <div className="card p-8 w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-light mb-4 text-gray-900 dark:text-white">Waiting for players...</h1>
            <CopyRoomCode roomId={roomId} />
          </div>

          <div className="mb-8">
            <div className="text-sm text-gray-500 dark:text-gray-500 mb-4 text-center">
              {gameState.players.length}/8 players
            </div>
            
            <div className="space-y-2">
              {gameState.players.map((player) => (
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

  // Main game view
  const isWordSelection = gameState.status === 'word-selection';
  const isRoundEnd = gameState.status === 'round-end';
  const showWordSelectionModal = isWordSelection && isCurrentPlayerDrawer() && gameState.wordChoices;
  const drawer = gameState.players.find(p => p.id === gameState.currentDrawer);
  const correctGuessers = gameState.guesses.filter(g => g.isCorrect).map(g => g.playerName);

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen flex flex-col relative">
      {/* Word Selection Overlay */}
      {isWordSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          {showWordSelectionModal ? (
            <div className="relative z-50">
              <WordSelectionModal
                words={gameState.wordChoices!}
                deadline={gameState.wordSelectionDeadline}
                onSelectWord={handleWordSelect}
              />
            </div>
          ) : (
            <div className="card p-8 w-full max-w-md text-center relative z-50">
              <div className="text-2xl mb-4">⏳</div>
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Word Selection
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {drawer?.name || 'The drawer'} is choosing a word...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Round End Reveal Overlay - shown for a few seconds whenever a turn
          ends (everyone guessed correctly, time ran out, or the drawer left),
          so players can actually see the word and who got it before the game
          moves on, instead of the round silently vanishing. */}
      {isRoundEnd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="card p-8 w-full max-w-md text-center relative z-50">
            <div className="text-3xl mb-3">{correctGuessers.length > 0 ? '🎉' : '⏰'}</div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              {correctGuessers.length > 0 ? 'Round Complete!' : "Time's Up!"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              The word was:{' '}
              <span className="font-bold text-gray-900 dark:text-white">
                {gameState.currentWord}
              </span>
            </p>
            {correctGuessers.length > 0 && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {correctGuessers.join(', ')} guessed correctly!
              </p>
            )}
          </div>
        </div>
      )}

      <div className={isWordSelection || isRoundEnd ? 'blur-sm pointer-events-none' : ''}>
        <div className="mb-4">
          <GameHeader
            roomId={roomId}
            roundNumber={gameState.currentRound}
            totalRounds={gameState.settings.rounds}
            timeRemaining={gameState.timeRemaining}
            totalTime={gameState.settings.timePerRound}
            onTimeEnd={handleTimeEnd}
            currentTurn={gameState.currentTurn}
            totalTurns={gameState.totalTurns}
          />
        </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 grid-responsive">
        {/* Drawing Board */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="card flex-1 flex flex-col min-h-[500px]">
            <div className="p-3 border-b border-card-border text-sm text-gray-600 dark:text-gray-400">
              {isCurrentPlayerDrawer() ? "Your turn to draw" : "Guess what's being drawn"}
            </div>
            <div className="flex-1 p-2">
              <TldrawCanvas 
                isDrawing={isCurrentPlayerDrawer()} 
                gameState={gameState}
                roomId={roomId}
                playerId={playerId}
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
                id: m.id,
                username: m.playerName,
                text: m.message,
                isCorrect: m.isCorrect,
              }))}
              isGuessing={!isCurrentPlayerDrawer() && !hasPlayerGuessedCorrectly() && gameState.status === 'playing'}
              timeLeft={gameState.timeRemaining}
              hasGuessedCorrectly={hasPlayerGuessedCorrectly()}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}