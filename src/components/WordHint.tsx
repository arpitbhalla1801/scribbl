"use client";

import { getProgressiveHint } from "@/lib/gameStateSanitizer";

interface WordHintProps {
  word: string;
  reveal?: boolean;
  timePerRound?: number;
  timeRemaining?: number;
}

const WordHint: React.FC<WordHintProps> = ({ 
  word, 
  reveal = false,
  timePerRound,
  timeRemaining
}) => {
  if (reveal) {
    return (
      <div className="card text-center py-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Your word to draw:
        </div>
        <div className="font-bold text-xl text-gray-900 dark:text-gray-100">
          &ldquo;{word}&rdquo;
        </div>
      </div>
    );
  }
  
  // Use progressive hint if time information is available
  let displayWord = word;
  if (timePerRound && typeof timeRemaining === 'number') {
    displayWord = getProgressiveHint(word, timePerRound, timeRemaining);
  }
  
  const hints = displayWord.split(' ').map((segment, segmentIndex) => (
    <div key={segmentIndex} className="flex gap-1">
      {segment.split('').map((char, charIndex) => 
        char === '_' ? (
          <span 
            key={`${segmentIndex}-${charIndex}`}
            className="inline-block w-6 h-8 border-b-2 border-gray-300 dark:border-gray-600 text-center font-mono text-lg text-gray-400 dark:text-gray-500"
          >
            _
          </span>
        ) : (
          <span 
            key={`${segmentIndex}-${charIndex}`}
            className="inline-block w-6 h-8 border-b-2 border-green-500 dark:border-green-600 text-center font-mono text-lg font-bold text-green-600 dark:text-green-400"
          >
            {char}
          </span>
        )
      )}
    </div>
  ));
  
  return (
    <div className="card text-center py-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Guess the word:
      </div>
      <div className="flex items-center justify-center flex-wrap gap-2 mb-2">
        {hints}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500">
        {word.replace(/\s/g, '').length} letter{word.replace(/\s/g, '').length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default WordHint;