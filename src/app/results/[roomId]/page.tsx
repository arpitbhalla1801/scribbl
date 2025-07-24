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
    const fetchResults = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockPlayers: Player[] = [
        { id: "player1", username: "Player 1", score: 850 },
        { id: "player2", username: "Player 2", score: 650 },
        { id: "player3", username: playerName, score: 450 },
      ];
      
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
    router.push(`/create?name=${encodeURIComponent(playerName)}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center card p-8 max-w-md w-full mx-4">
          <div className="animate-spin h-8 w-8 border-2 border-gray-900 dark:border-gray-100 rounded-full border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Results</h2>
          <p className="text-gray-600 dark:text-gray-400">Calculating scores...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-2xl min-h-screen flex flex-col items-center justify-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium mb-4 text-gray-900 dark:text-gray-100">Game Complete</h1>
          <p className="text-gray-600 dark:text-gray-400">Room: <span className="font-medium text-gray-900 dark:text-gray-100">{roomId}</span></p>
        </div>
        
        <div className="card mb-8">
          <div className="p-4 border-b border-card-border">
            <h2 className="text-lg font-medium text-center text-gray-900 dark:text-gray-100">Final Rankings</h2>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded ${
                    player.rank === 1 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' 
                      : 'bg-gray-50 dark:bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 font-medium text-sm">
                      {player.rank}
                    </div>
                    
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {player.username}
                        {player.username === playerName && (
                          <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">(you)</span>
                        )}
                      </div>
                      {player.rank === 1 && (
                        <div className="text-xs text-yellow-700 dark:text-yellow-300">Winner</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{player.score}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">points</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handlePlayAgain}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Play Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}