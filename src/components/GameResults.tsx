"use client";

import { GameState } from '@/lib/types';
import Link from 'next/link';

interface GameResultsProps {
  gameState: GameState;
}

export default function GameResults({ gameState }: GameResultsProps) {
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const secondPlace = sortedPlayers[1];
  const thirdPlace = sortedPlayers[2];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2 animate-bounce-in" aria-hidden="true">🎉</div>
          <h1 className="text-4xl mb-2 text-primary">Game over!</h1>
          <p className="text-secondary">
            Room <span className="font-bold text-primary">{gameState.roomId}</span>
          </p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-8">
          {secondPlace && (
            <div className="flex flex-col items-center">
              <div
                className="w-24 h-28 rounded-t-2xl flex flex-col items-center justify-center border-2 border-b-0"
                style={{ background: '#d9d9e3', borderColor: 'var(--ink)' }}
              >
                <div className="text-3xl mb-1">🥈</div>
              </div>
              <div className="mt-2 text-center">
                <p className="font-bold text-primary">{secondPlace.name}</p>
                <p className="font-bold text-secondary">{secondPlace.score} pts</p>
              </div>
            </div>
          )}

          {winner && (
            <div className="flex flex-col items-center">
              <div
                className="w-28 h-36 rounded-t-2xl flex flex-col items-center justify-center border-2 border-b-0"
                style={{ background: 'var(--marker-yellow)', borderColor: 'var(--ink)' }}
              >
                <div className="text-4xl mb-1">👑</div>
              </div>
              <div className="mt-2 text-center">
                <p className="font-bold text-lg text-primary">{winner.name}</p>
                <p className="font-bold text-xl" style={{ color: 'var(--marker-yellow-dark)' }}>{winner.score} pts</p>
              </div>
            </div>
          )}

          {thirdPlace && (
            <div className="flex flex-col items-center">
              <div
                className="w-24 h-20 rounded-t-2xl flex flex-col items-center justify-center border-2 border-b-0"
                style={{ background: '#f0b27a', borderColor: 'var(--ink)' }}
              >
                <div className="text-2xl mb-1">🥉</div>
              </div>
              <div className="mt-2 text-center">
                <p className="font-bold text-primary">{thirdPlace.name}</p>
                <p className="font-bold text-secondary">{thirdPlace.score} pts</p>
              </div>
            </div>
          )}
        </div>

        {/* Full leaderboard */}
        <div className="card p-5 mb-6">
          <h2 className="text-lg mb-4 text-center text-primary">Final leaderboard</h2>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              const rank = index + 1;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl border-2"
                  style={{ borderColor: 'var(--card-border)', background: rank <= 3 ? 'var(--paper-dim)' : 'transparent' }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`rank-badge ${rank <= 3 ? `rank-${rank}` : ''}`}>{rank}</span>
                    <p className="font-bold text-primary">
                      {player.name}
                      {player.isHost && (
                        <span
                          className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: 'var(--marker-blue)', color: '#fff' }}
                        >
                          HOST
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-bold text-lg text-primary tabular-nums">{player.score}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/create" className="btn-primary flex-1 text-center">
            Play again
          </Link>
          <Link href="/" className="btn-secondary flex-1 text-center">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
