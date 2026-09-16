"use client";

import { useState, useEffect } from 'react';

interface WordSelectionModalProps {
  words: string[];
  onSelectWord: (wordIndex: number) => void;
  deadline?: number; // Unix timestamp
}

const CARD_COLORS = ['var(--marker-blue)', 'var(--marker-green)', 'var(--marker-purple)'];

export default function WordSelectionModal({
  words,
  onSelectWord,
  deadline
}: WordSelectionModalProps) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const updateCountdown = () => {
      if (deadline) {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setCountdown(remaining);

        if (remaining === 0) {
          // Auto-select first word if time runs out
          onSelectWord(0);
        }
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 100);

    return () => clearInterval(timer);
  }, [deadline, onSelectWord]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <div className="card p-8 max-w-md w-full animate-bounce-in">
        <div className="text-center text-3xl mb-2" aria-hidden="true">✏️</div>
        <h2 className="text-2xl text-center mb-1 text-primary">
          Pick a word to draw
        </h2>
        <p className="text-center text-secondary mb-6 text-sm">
          Auto-picks the first word in{' '}
          <span className="font-bold" style={{ color: countdown <= 3 ? 'var(--marker-red)' : 'var(--text-primary)' }}>
            {countdown}s
          </span>
        </p>

        <div className="space-y-3">
          {words.map((word, index) => (
            <button
              key={word}
              onClick={() => onSelectWord(index)}
              className="w-full py-4 px-6 text-lg font-bold rounded-2xl border-2 transition-all hover:-translate-y-0.5"
              style={{
                borderColor: CARD_COLORS[index % CARD_COLORS.length],
                color: 'var(--text-primary)',
                background: 'var(--card-bg)',
                fontFamily: 'var(--font-display)',
                boxShadow: `0 3px 0 0 ${CARD_COLORS[index % CARD_COLORS.length]}`,
              }}
            >
              {word}
              <span className="ml-2 text-sm font-normal text-muted">
                {word.replace(/\s/g, '').length} letters
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
