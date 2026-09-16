"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { savePlayerSession } from "@/lib/sessionManager";

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

      savePlayerSession(gameCode, data.playerId, playerName.trim());
      router.push(`/game/${gameCode}?playerId=${data.playerId}&name=${encodeURIComponent(playerName.trim())}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join game');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2" aria-hidden="true">🚪</div>
          <h1 className="text-3xl mb-1 text-primary">Join a room</h1>
          <p className="text-secondary text-sm">Got a room code from a friend? Pop it in below.</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className="p-3 rounded-xl text-sm font-medium border-2"
                style={{ background: 'var(--danger-light)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="gameCode" className="block text-sm font-semibold text-secondary mb-2">
                Room code
              </label>
              <input
                id="gameCode"
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                required
                className="w-full uppercase text-2xl text-center tracking-[0.3em]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                placeholder="ABC123"
                maxLength={6}
              />
            </div>

            <div>
              <label htmlFor="playerName" className="block text-sm font-semibold text-secondary mb-2">
                Your name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                required
                className="w-full"
                placeholder="What should we call you?"
                maxLength={20}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading || !playerName.trim() || !gameCode.trim() || gameCode.length !== 6}
                className="btn-primary flex-1"
              >
                {isLoading ? "Joining…" : "Join room"}
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
          <p className="text-sm text-secondary">
            Nobody to join yet?{" "}
            <Link href="/create" className="font-semibold" style={{ color: 'var(--marker-blue)' }}>
              Start a room
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}