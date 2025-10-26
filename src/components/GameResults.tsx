"use client";

import { GameState } from '@/lib/types';
import Link from 'next/link';

interface GameResultsProps {
  gameState: GameState;
}

export default function GameResults({ gameState }: GameResultsProps) {
  // Sort players by score (descending)
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  
  // Get top 3 for podium
  const winner = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            🎉 Game Over! 🎉
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Room: <span className="font-mono font-bold">{gameState.roomId}</span>
          </p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* Second Place */}
          {secondPlace && (
            <div className="flex flex-col items-center">
              <div className="bg-gray-300 dark:bg-gray-700 w-24 h-32 rounded-t-lg flex flex-col items-center justify-center">
                <div className="text-4xl mb-2">🥈</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">2nd</div>
              </div>
              <div className="mt-3 text-center">
                <p className="font-semibold text-gray-900 dark:text-white">{secondPlace.name}</p>
                <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{secondPlace.score} pts</p>
              </div>
            </div>
          )}

          {/* First Place */}
          {winner && (
            <div className="flex flex-col items-center">
              <div className="bg-yellow-400 dark:bg-yellow-600 w-32 h-40 rounded-t-lg flex flex-col items-center justify-center shadow-lg">
                <div className="text-5xl mb-2">👑</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">1st</div>
              </div>
              <div className="mt-3 text-center">
                <p className="font-bold text-xl text-gray-900 dark:text-white">{winner.name}</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{winner.score} pts</p>
              </div>
            </div>
          )}

          {/* Third Place */}
          {thirdPlace && (
            <div className="flex flex-col items-center">
              <div className="bg-orange-300 dark:bg-orange-700 w-24 h-24 rounded-t-lg flex flex-col items-center justify-center">
                <div className="text-3xl mb-1">🥉</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">3rd</div>
              </div>
              <div className="mt-3 text-center">
                <p className="font-semibold text-gray-900 dark:text-white">{thirdPlace.name}</p>
                <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{thirdPlace.score} pts</p>
              </div>
            </div>
          )}
        </div>

        {/* Full Leaderboard */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white text-center">
            Final Leaderboard
          </h2>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0
                    ? 'bg-yellow-100 dark:bg-yellow-900/20'
                    : index === 1
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : index === 2
                    ? 'bg-orange-100 dark:bg-orange-900/20'
                    : 'bg-white dark:bg-gray-900'
                } border border-gray-200 dark:border-gray-700`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-500 dark:text-gray-400 w-8">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {player.name}
                      {player.isHost && (
                        <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                          HOST
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {player.score}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Stats */}
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Game Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{gameState.currentRound}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rounds Played</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{gameState.players.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Players</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/create" className="btn-primary flex-1 text-center">
            New Game
          </Link>
          <Link href="/" className="btn-secondary flex-1 text-center">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
