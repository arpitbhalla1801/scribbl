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
    
    // Validate game code (for example, all uppercase and 6 characters)
    if (!/^[A-Z0-9]{6}$/.test(gameCode)) {
      setError("Invalid game code. Please check and try again.");
      setIsLoading(false);
      return;
    }
    
    // In a real implementation, you would validate the room code with the server
    
    // Wait for a simulated API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Navigate to the game room
    router.push(`/game/${gameCode}?name=${encodeURIComponent(playerName)}`);
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Join Game</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Enter a game code to join your friends
          </p>
        </div>
        
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="gameCode" className="block text-sm font-medium mb-1">
                Game Code
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                required
                className="w-full uppercase"
                placeholder="Enter 6-character code"
                maxLength={6}
              />
            </div>
            
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
            
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={isLoading || !playerName.trim() || !gameCode.trim()}
                className="btn-primary flex-1"
              >
                {isLoading ? "Joining..." : "Join Game"}
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
        
        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Don't have a game code?{" "}
            <Link href="/create" className="text-primary hover:underline">
              Create a new game
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}