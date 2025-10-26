"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateGamePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [rounds, setRounds] = useState(3);
  const [timePerRound, setTimePerRound] = useState(60);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
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

      // Navigate to the game room with the player ID and name
      router.push(`/game/${data.roomId}?playerId=${data.playerId}&name=${encodeURIComponent(playerName)}`);
    } catch (error) {
      console.error('Failed to create game:', error);
      alert(error instanceof Error ? error.message : 'Failed to create game');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light mb-4 text-gray-900 dark:text-white">Create Game</h1>
        </div>
        
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="playerName" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
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
                maxLength={20}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rounds" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Rounds
                </label>
                <select
                  id="rounds"
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-full"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="timePerRound" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Time (sec)
                </label>
                <select
                  id="timePerRound"
                  value={timePerRound}
                  onChange={(e) => setTimePerRound(Number(e.target.value))}
                  className="w-full"
                >
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                  <option value={120}>120</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full"
              >
                <option value="easy">Easy (Short words)</option>
                <option value="medium">Medium (Normal words)</option>
                <option value="hard">Hard (Long words)</option>
              </select>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading || !playerName.trim()}
                className="btn-primary flex-1"
              >
                {isLoading ? "Creating..." : "Start"}
              </button>
              <Link
                href="/"
                className="btn-secondary px-6"
              >
                Back
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}