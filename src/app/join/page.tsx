"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinGamePage() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      if (!/^[A-Z0-9]{6}$/.test(gameCode)) {
        throw new Error("Invalid game code. Please check and try again.");
      }

      if (!playerName.trim()) {
        throw new Error("Player name is required.");
      }

      const response = await fetch(`/api/games/${gameCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: playerName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join game');
      }

      router.push(`/game/${gameCode}?playerId=${data.playerId}&name=${encodeURIComponent(playerName.trim())}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join game');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light mb-4 text-gray-900 dark:text-white">Join Game</h1>
        </div>
        
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="gameCode" className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Game Code
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                required
                className="w-full uppercase font-mono text-lg text-center"
                placeholder="ABC123"
                maxLength={6}
              />
            </div>
            
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
            
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading || !playerName.trim() || !gameCode.trim() || gameCode.length !== 6}
                className="btn-primary flex-1"
              >
                {isLoading ? "Joining..." : "Join"}
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
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Need a game?{" "}
            <Link href="/create" className="text-gray-900 dark:text-white hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}