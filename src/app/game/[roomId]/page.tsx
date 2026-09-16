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
            <div className="text-3xl mb-2" aria-hidden="true">🎨</div>
            <h1 className="text-2xl mb-4 text-primary">Waiting for players…</h1>
            <CopyRoomCode roomId={roomId} />
          </div>

          <div className="mb-8">
            <div className="text-sm text-secondary mb-3 text-center font-semibold">
              {gameState.players.length}/8 players
            </div>

            <div className="space-y-2">
              {gameState.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl border-2"
                  style={{
                    borderColor: player.id === playerId ? 'var(--marker-blue)' : 'var(--card-border)',
                    background: player.id === playerId ? 'var(--paper-dim)' : 'transparent',
                  }}
                >
                  <span className="text-sm font-semibold text-primary">{player.name}</span>
                  {player.isHost && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: 'var(--marker-blue)', color: '#fff' }}
                    >
                      HOST
                    </span>
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
                Start game
              </button>
            ) : isHost ? (
              <div className="w-full py-3 text-center text-muted text-sm">
                Need at least 2 players to start
              </div>
            ) : (
              <div className="w-full py-3 text-center text-muted text-sm">
                Waiting for the host to start…
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

  const turnBanner = isCurrentPlayerDrawer()
    ? "🖍️ Your turn — draw the word above!"
    : "👀 Guess what's being drawn";

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen flex flex-col relative">
      {/* Word Selection Overlay */}
      {isWordSelection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          {showWordSelectionModal ? (
            <div className="relative z-50">
              <WordSelectionModal
                words={gameState.wordChoices!}
                deadline={gameState.wordSelectionDeadline}
                onSelectWord={handleWordSelect}
              />
            </div>
          ) : (
            <div className="card p-8 w-full max-w-md text-center relative z-50 animate-pop-in">
              <div className="text-3xl mb-4" aria-hidden="true">⏳</div>
              <h2 className="text-xl mb-2 text-primary">
                Picking a word…
              </h2>
              <p className="text-secondary">
                <span className="font-bold text-primary">{drawer?.name || 'The drawer'}</span> is choosing what to draw.
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="card p-8 w-full max-w-md text-center relative z-50 animate-bounce-in">
            <div className="text-4xl mb-3" aria-hidden="true">{correctGuessers.length > 0 ? '🎉' : '⏰'}</div>
            <h2 className="text-2xl mb-2 text-primary">
              {correctGuessers.length > 0 ? 'Round complete!' : "Time's up!"}
            </h2>
            <p className="text-secondary mb-3">
              The word was{' '}
              <span className="font-bold text-lg" style={{ color: 'var(--marker-blue)' }}>
                {gameState.currentWord}
              </span>
            </p>
            {correctGuessers.length > 0 && (
              <p className="text-sm font-semibold" style={{ color: 'var(--marker-green)' }}>
                ✓ {correctGuessers.join(', ')} guessed it!
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
        {/* Drawing Board - the hero: a thick whiteboard frame, not another card */}
        <div className="lg:col-span-4 flex flex-col">
          <div
            className="mb-2 px-1 text-sm font-bold text-center lg:text-left"
            style={{ color: isCurrentPlayerDrawer() ? 'var(--marker-blue)' : 'var(--text-secondary)' }}
          >
            {turnBanner}
          </div>
          <div className="canvas-container flex-1 flex flex-col min-h-[500px] overflow-hidden">
            <div className="flex-1 p-2">
              <TldrawCanvas
                isDrawing={isCurrentPlayerDrawer()}
                gameState={gameState}
                roomId={roomId}
                playerId={playerId}
              />
            </div>
          </div>

          {/* Word Hint - the server progressively reveals letters into
              currentWord as time passes (see gameStateSanitizer) */}
          <div className="mt-4">
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