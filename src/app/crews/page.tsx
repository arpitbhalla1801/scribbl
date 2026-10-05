"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

interface Crew {
  id: string;
  name: string;
  role: string;
}

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCrews = async () => {
    const response = await fetch('/api/crews');
    const data = await response.json();
    if (response.ok) setCrews(data.crews);
  };

  useEffect(() => {
    loadCrews();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create crew');

      setName("");
      await loadCrews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create crew');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async (crewId: string) => {
    await fetch(`/api/crews/${crewId}`, { method: 'DELETE' });
    await loadCrews();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2" aria-hidden="true">👥</div>
          <h1 className="text-3xl mb-1 text-primary">Your crews</h1>
          <p className="text-secondary text-sm">Play regularly with the same group.</p>
        </div>

        <div className="card p-6 space-y-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Crew name"
              maxLength={40}
              required
              className="flex-1"
            />
            <button type="submit" disabled={isLoading || !name.trim()} className="btn-primary px-4">
              Create
            </button>
          </form>
          {error && <p className="text-sm text-red-500">{error}</p>}

          {crews.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No crews yet.</p>
          ) : (
            <div className="space-y-2">
              {crews.map((crew) => (
                <div key={crew.id} className="flex items-center justify-between p-3 rounded-xl border-2" style={{ borderColor: 'var(--card-border)' }}>
                  <div>
                    <div className="font-semibold text-primary">{crew.name}</div>
                    <div className="text-xs text-muted capitalize">{crew.role}</div>
                  </div>
                  <button onClick={() => handleLeave(crew.id)} className="btn-secondary !py-1.5 !px-3 !text-sm">
                    Leave
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-4">
          <Link href="/" className="text-sm text-secondary underline underline-offset-2">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
