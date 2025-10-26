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
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 font-mono text-xl font-bold text-center text-gray-900 dark:text-white">
        {roomId}
      </div>
      <button
        onClick={copyToClipboard}
        className="btn-secondary px-4 py-3 whitespace-nowrap"
        title="Copy room code"
      >
        {copied ? '✓ Copied!' : '📋 Copy'}
      </button>
      <button
        onClick={shareLink}
        className="btn-secondary px-4 py-3"
        title="Share game link"
      >
        🔗
      </button>
    </div>
  );
}
