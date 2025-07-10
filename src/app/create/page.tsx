"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateGamePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [rounds, setRounds] = useState(3);
  const [timePerRound, setTimePerRound] = useState(60);
  const [difficulty, setDifficulty] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          settings: {
            rounds,
            timePerRound,
            difficulty,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game');
      }

      // Navigate to the game room with the player ID
      router.push(`/game/${data.roomId}?playerId=${data.playerId}&host=true`);
    } catch (error) {
      console.error('Failed to create game:', error);
      alert(error instanceof Error ? error.message : 'Failed to create game');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Game</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Set up your Scribbl game and invite friends to play
          </p>
        </div>
        
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
                className="w-full"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label htmlFor="rounds" className="block text-sm font-medium mb-1">
                Number of Rounds
              </label>
              <select
                id="rounds"
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full"
              >
                <option value={2}>2 Rounds</option>
                <option value={3}>3 Rounds</option>
                <option value={4}>4 Rounds</option>
                <option value={5}>5 Rounds</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="timePerRound" className="block text-sm font-medium mb-1">
                Time per Round
              </label>
              <select
                id="timePerRound"
                value={timePerRound}
                onChange={(e) => setTimePerRound(Number(e.target.value))}
                className="w-full"
              >
                <option value={30}>30 Seconds</option>
                <option value={60}>60 Seconds</option>
                <option value={90}>90 Seconds</option>
                <option value={120}>120 Seconds</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium mb-1">
                Word Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={isLoading || !playerName.trim()}
                className="btn-primary flex-1"
              >
                {isLoading ? "Creating..." : "Start Game"}
              </button>
              <Link
                href="/"
                className="btn-secondary flex-1 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}