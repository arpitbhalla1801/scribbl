"use client";

import { useState, useEffect } from 'react';

interface WordSelectionModalProps {
  words: string[];
  onSelectWord: (wordIndex: number) => void;
  deadline?: number; // Unix timestamp
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-semibold mb-2 text-center text-gray-900 dark:text-white">
          Choose a word to draw
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Time remaining: <span className="font-bold text-lg">{countdown}s</span>
        </p>
        
        <div className="space-y-3">
          {words.map((word, index) => (
            <button
              key={word}
              onClick={() => onSelectWord(index)}
              className="w-full py-4 px-6 text-lg font-medium rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all transform hover:scale-105 text-gray-900 dark:text-white"
            >
              {word}
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                ({word.length} letters)
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-4">
          First word will be auto-selected if time runs out
        </p>
      </div>
    </div>
  );
}
