"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Invite {
  crewId: string;
  crewName: string;
  status: string;
}

export default function JoinCrewPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code ?? "") as string;

  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/crews/invites/${code}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setInvite(data.invite))
      .catch(() => setNotFound(true));
  }, [code]);

  const handleJoin = async () => {
    setIsJoining(true);
    setError("");
    try {
      const response = await fetch(`/api/crews/invites/${code}/accept`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to join crew');
      router.push('/crews');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join crew');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="text-4xl mb-2" aria-hidden="true">👥</div>

        {notFound ? (
          <p className="text-secondary">This invite doesn&apos;t exist or was already used.</p>
        ) : !invite ? (
          <p className="text-secondary">Loading invite…</p>
        ) : invite.status !== 'pending' ? (
          <p className="text-secondary">This invite is no longer valid.</p>
        ) : (
          <div className="card p-6">
            <h1 className="text-2xl mb-4 text-primary">Join {invite.crewName}?</h1>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <button onClick={handleJoin} disabled={isJoining} className="btn-primary w-full">
              {isJoining ? "Joining…" : "Join crew"}
            </button>
          </div>
        )}

        <div className="mt-4">
          <Link href="/crews" className="text-sm text-secondary underline underline-offset-2">
            Your crews
          </Link>
        </div>
      </div>
    </div>
  );
}
