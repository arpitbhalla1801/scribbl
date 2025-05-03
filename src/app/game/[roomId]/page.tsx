"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Canvas from "@/components/Canvas";
import ChatBox from "@/components/ChatBox";
import PlayerList from "@/components/PlayerList";
import WordHint from "@/components/WordHint";
import GameHeader from "@/components/GameHeader";

// Mock data for demonstration
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

  // Game state
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [playerId, setPlayerId] = useState("");

  useEffect(() => {
    // In a real app, you would connect to WebSocket here
    // Simulate connection and initial game state
    const connectToGame = async () => {
      // Wait for a simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate a unique player ID
      const id = Math.random().toString(36).substring(2, 10);
      setPlayerId(id);

      // For demo purposes, create mock players
      const mockPlayers: Player[] = [
        { id, username: playerName, score: 0, isDrawing: isHost },
        { id: "player2", username: "Player 2", score: 150 },
        { id: "player3", username: "Player 3", score: 300 },
      ];

      // If host, set as drawing player and assign a random word
      if (isHost) {
        setIsDrawing(true);
        const randomWord = MOCK_WORDS[Math.floor(Math.random() * MOCK_WORDS.length)];
        setCurrentWord(randomWord);
      }

      setPlayers(mockPlayers);
      setConnected(true);

      // Add a welcome message
      addMessage("System", `Welcome to room ${roomId}!`);
    };

    connectToGame();

    // Cleanup function for real WebSocket connection
    return () => {
      // In a real app, you would disconnect from WebSocket here
    };
  }, [roomId, playerName, isHost]);

  // Add a new message to the chat
  const addMessage = (username: string, text: string, isCorrect: boolean = false) => {
    const newMessage: Message = {
      id: Date.now(),
      username,
      text,
      isCorrect,
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // Handle sending a chat message
  const handleSendMessage = (message: string) => {
    addMessage(playerName, message);

    // Check if the message is the correct word
    if (!isDrawing && message.toLowerCase() === currentWord.toLowerCase()) {
      // Calculate score based on time remaining
      const score = timeRemaining * 10;
      
      // Update player score
      setPlayers(prev => 
        prev.map(player => 
          player.id === playerId 
            ? { ...player, score: player.score + score }
            : player
        )
      );

      // Add a system message
      addMessage("System", `${playerName} guessed the word correctly! +${score} points`, true);
    }
  };

  // Handle when drawing data changes
  const handleDrawingChange = (imageData: string) => {
    // In a real app, you would send this data over WebSocket
    console.log("Drawing updated:", imageData.substring(0, 50) + "...");
  };

  // Handle when timer ends
  const handleTimeEnd = () => {
    // In a real app, you would handle round end logic
    addMessage("System", `Time's up! The word was "${currentWord}"`);
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