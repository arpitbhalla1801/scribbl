"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { savePlayerSession } from "@/lib/sessionManager";

export default function CreateGamePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [rounds, setRounds] = useState(3);
  const [timePerRound, setTimePerRound] = useState(60);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [customWordsText, setCustomWordsText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const customWords = customWordsText
    .split(/[,\n]/)
    .map(w => w.trim())
    .filter(Boolean);

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
            ...(customWords.length >= 3 ? { customWords } : {}),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game');
      }

      // Save the session so a reload/lost URL param can still recover it
      savePlayerSession(data.roomId, data.playerId, playerName);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2" aria-hidden="true">🖍️</div>
          <h1 className="text-3xl mb-1 text-primary">Create a room</h1>
          <p className="text-secondary text-sm">Set the rules, then invite your friends in.</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rounds" className="block text-sm font-semibold text-secondary mb-2">
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
                <label htmlFor="timePerRound" className="block text-sm font-semibold text-secondary mb-2">
                  Time per turn
                </label>
                <select
                  id="timePerRound"
                  value={timePerRound}
                  onChange={(e) => setTimePerRound(Number(e.target.value))}
                  className="w-full"
                >
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>120s</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary mb-2">
                Word difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className="rounded-xl border-2 py-2.5 text-sm font-bold capitalize transition-colors"
                    style={
                      difficulty === level
                        ? { borderColor: 'var(--marker-blue)', background: 'var(--marker-blue)', color: '#fff' }
                        : { borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }
                    }
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="customWords" className="block text-sm font-semibold text-secondary mb-2">
                Custom word pack (optional)
              </label>
              <textarea
                id="customWords"
                value={customWordsText}
                onChange={(e) => setCustomWordsText(e.target.value)}
                className="w-full"
                rows={3}
                placeholder="Comma or newline separated, e.g: dragon, sandwich, umbrella"
              />
              <p className="text-xs text-secondary mt-1">
                {customWordsText.trim() === ""
                  ? "Leave blank to use the built-in word lists."
                  : customWords.length >= 3
                    ? `${customWords.length} words - difficulty is ignored for custom packs.`
                    : `Need at least 3 words (${customWords.length} so far) or this will be ignored.`}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading || !playerName.trim()}
                className="btn-primary flex-1"
              >
                {isLoading ? "Creating…" : "Create room"}
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