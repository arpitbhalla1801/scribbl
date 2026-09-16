"use client";

import { useState } from 'react';

interface CopyRoomCodeProps {
  roomId: string;
}

export default function CopyRoomCode({ roomId }: CopyRoomCodeProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareLink = () => {
    const url = `${window.location.origin}/join?code=${roomId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join my Scribbl game!',
        text: `Join my drawing game with code: ${roomId}`,
        url: url,
      }).catch((err) => console.error('Share failed:', err));
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div
        className="flex-1 rounded-xl px-4 py-3 text-2xl text-center tracking-[0.3em] border-2"
        style={{ borderColor: 'var(--ink)', background: 'var(--paper-dim)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}
      >
        {roomId}
      </div>
      <button
        onClick={copyToClipboard}
        className="btn-secondary px-4 py-3 whitespace-nowrap !min-h-0"
        title="Copy room code"
      >
        {copied ? '✓ Copied' : '📋 Copy'}
      </button>
      <button
        onClick={shareLink}
        className="btn-secondary px-4 py-3 !min-h-0"
        title="Share game link"
      >
        🔗
      </button>
    </div>
  );
}
