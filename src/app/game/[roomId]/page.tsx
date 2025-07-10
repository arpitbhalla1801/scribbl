"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { generateMessageId } from "@/lib/utils";
import { GameAPI } from "@/lib/gameAPI";
import Canvas from "@/components/Canvas";
import ChatBox from "@/components/ChatBox";
import PlayerList from "@/components/PlayerList";
import WordHint from "@/components/WordHint";
import GameHeader from "@/components/GameHeader";

const MOCK_WORDS = ["apple", "banana", "elephant", "computer", "mountain", "rainbow", "bicycle"];

interface Message {
  id: number;
  username: string;
  text: string;
  isCorrect?: boolean;
}

interface Player {
  id: string;
  username: string;
  score: number;
  isDrawing?: boolean;
}

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "Guest";
  const isHost = searchParams.get("host") === "true";

  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [playerId, setPlayerId] = useState("");
  const welcomeMessageSent = useRef<string | null>(null);
  const timeoutHandled = useRef(false);

  useEffect(() => {
    const connectToGame = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const id = Math.random().toString(36).substring(2, 10);
      setPlayerId(id);

      const mockPlayers: Player[] = [
        { id, username: playerName, score: 0, isDrawing: isHost },
        { id: "player2", username: "Player 2", score: 150 },
        { id: "player3", username: "Player 3", score: 300 },
      ];

      if (isHost) {
        setIsDrawing(true);
        const randomWord = MOCK_WORDS[Math.floor(Math.random() * MOCK_WORDS.length)];
        setCurrentWord(randomWord);
      }

      setPlayers(mockPlayers);
      setConnected(true);

      if (welcomeMessageSent.current !== roomId) {
        addMessage("System", `Welcome to room ${roomId}!`);
        welcomeMessageSent.current = roomId;
      }
    };

    connectToGame();

    return () => {
    };
  }, [roomId, playerName, isHost]);

  const addMessage = (username: string, text: string, isCorrect: boolean = false) => {
    const newMessage: Message = {
      id: generateMessageId(),
      username,
      text,
      isCorrect,
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  const handleSendMessage = (message: string) => {
    addMessage(playerName, message);

    if (!isDrawing && message.toLowerCase() === currentWord.toLowerCase()) {
      const score = timeRemaining * 10;
      
      setPlayers(prev => 
        prev.map(player => 
          player.id === playerId 
            ? { ...player, score: player.score + score }
            : player
        )
      );

      addMessage("System", `${playerName} guessed the word correctly! +${score} points`, true);
    }
  };

  const handleDrawingChange = (imageData: string) => {
    console.log("Drawing updated:", imageData.substring(0, 50) + "...");
  };

  // Handle when timer ends
  const handleTimeEnd = async () => {
    // Prevent multiple calls
    if (timeoutHandled.current) return;
    timeoutHandled.current = true;

    try {
      // Add system message about time being up
      addMessage("System", `Time's up! The word was "${currentWord}"`);
      
      // Call the backend to handle timeout
      const result = await GameAPI.handleTimeOut(roomId);
      
      if (result.success && result.gameState) {
        // Update game state based on server response
        // In a real app, you'd update the UI based on the new game state
        console.log('Round ended due to timeout:', result.gameState);
        
        // Reset timeout flag for next round
        setTimeout(() => {
          timeoutHandled.current = false;
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling timeout:', error);
      timeoutHandled.current = false;
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">Connecting to game...</div>
          <div className="animate-spin h-10 w-10 border-4 border-primary rounded-full border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen flex flex-col">
      <div className="mb-4">
        <GameHeader
          roomId={roomId}
          roundNumber={roundNumber}
          totalRounds={totalRounds}
          timeRemaining={timeRemaining}
          onTimeEnd={handleTimeEnd}
        />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col">
          <div className="card flex-1 flex flex-col">
            <div className="p-3 border-b border-card-border font-medium">Drawing Board</div>
            <div className="flex-1 p-2 min-h-[300px]">
              <Canvas 
                isDrawing={isDrawing} 
                onDrawingChange={handleDrawingChange} 
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-center py-4 card">
            <WordHint 
              word={currentWord} 
              reveal={isDrawing} 
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <PlayerList 
            players={players}
            currentPlayerId={playerId}
          />
          
          <div className="flex-1 min-h-[300px]">
            <ChatBox
              username={playerName}
              onMessageSend={handleSendMessage}
              messages={messages}
              isGuessing={!isDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}