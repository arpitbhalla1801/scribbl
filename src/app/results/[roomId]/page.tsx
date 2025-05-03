"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Player {
  id: string;
  username: string;
  score: number;
  rank?: number;
}

export default function ResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "Guest";
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // In a real app, you would fetch results from an API
    const fetchResults = async () => {
      // Wait for a simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockPlayers: Player[] = [
        { id: "player1", username: "Player 1", score: 850 },
        { id: "player2", username: "Player 2", score: 650 },
        { id: "player3", username: playerName, score: 450 },
      ];
      
      // Sort players by score and assign ranks
      const sortedPlayers = [...mockPlayers]
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
          ...player,
          rank: index + 1
        }));
      
      setPlayers(sortedPlayers);
      setIsLoading(false);
    };
    
    fetchResults();
  }, [roomId, playerName]);
  
  const handlePlayAgain = () => {
    // In a real app, you would create a new game with the same players
    router.push(`/create?name=${encodeURIComponent(playerName)}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold">Loading results...</div>
          <div className="animate-spin h-10 w-10 border-4 border-primary rounded-full border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-2xl min-h-screen flex flex-col items-center justify-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Game Results</h1>
          <p className="text-gray-600 dark:text-gray-300">Room: {roomId}</p>
        </div>
        
        <div className="card mb-8 overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Final Scores</h2>
            
            <div className="space-y-4">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className={`flex items-center p-4 rounded-lg ${
                    player.rank === 1 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' 
                      : 'bg-gray-50 dark:bg-gray-800/30'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                    player.rank === 1 
                      ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200' 
                      : player.rank === 2 
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' 
                        : player.rank === 3 
                          ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}>
                    {player.rank}
                  </div>
                  <div className="ml-4 flex-grow">
                    <div className="font-semibold text-lg">
                      {player.username}
                      {player.username === playerName && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {player.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handlePlayAgain}
            className="btn-primary py-3 px-8"
          >
            Play Again
          </button>
          <Link
            href="/"
            className="btn-secondary py-3 px-8 text-center"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}