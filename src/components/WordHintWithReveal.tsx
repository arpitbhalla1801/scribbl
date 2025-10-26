import { useEffect, useState } from 'react';

interface WordHintWithRevealProps {
  word: string;
  timeRemaining: number;
  totalTime: number;
  isDrawing: boolean;
}

export default function WordHintWithReveal({ 
  word, 
  timeRemaining, 
  totalTime,
  isDrawing 
}: WordHintWithRevealProps) {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isDrawing || !word) {
      setRevealedIndices(new Set());
      return;
    }

    // Reveal letters at 75%, 50%, and 25% time remaining
    const percentRemaining = (timeRemaining / totalTime) * 100;
    const wordLength = word.length;
    const letterIndices = Array.from({ length: wordLength }, (_, i) => i)
      .filter(i => word[i] !== ' '); // Don't count spaces

    let lettersToReveal = 0;
    if (percentRemaining <= 75 && percentRemaining > 50) {
      lettersToReveal = 1;
    } else if (percentRemaining <= 50 && percentRemaining > 25) {
      lettersToReveal = 2;
    } else if (percentRemaining <= 25) {
      lettersToReveal = 3;
    }

    if (lettersToReveal > 0 && revealedIndices.size < lettersToReveal) {
      // Reveal random letters
      const newRevealed = new Set(revealedIndices);
      const unrevealed = letterIndices.filter(i => !newRevealed.has(i));
      
      while (newRevealed.size < Math.min(lettersToReveal, letterIndices.length) && unrevealed.length > 0) {
        const randomIndex = Math.floor(Math.random() * unrevealed.length);
        const letterIndex = unrevealed[randomIndex];
        newRevealed.add(letterIndex);
        unrevealed.splice(randomIndex, 1);
      }
      
      setRevealedIndices(newRevealed);
    }
  }, [timeRemaining, totalTime, word, isDrawing, revealedIndices]);

  if (isDrawing) {
    // Drawer sees the full word
    return (
      <div className="text-center py-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Draw this:</p>
        <div className="text-4xl font-bold text-gray-900 dark:text-white tracking-wider">
          {word}
        </div>
      </div>
    );
  }

  // Guessers see hints
  return (
    <div className="text-center py-6">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Guess the word:</p>
      <div className="flex justify-center gap-2 flex-wrap">
        {word.split('').map((char, index) => {
          if (char === ' ') {
            return <div key={index} className="w-4" />;
          }
          
          const isRevealed = revealedIndices.has(index);
          
          return (
            <div
              key={index}
              className={`
                w-10 h-12 flex items-center justify-center text-2xl font-bold
                border-b-4 border-gray-300 dark:border-gray-700
                ${isRevealed 
                  ? 'text-green-600 dark:text-green-400 border-green-500 dark:border-green-600' 
                  : 'text-transparent'
                }
                transition-all duration-300
              `}
            >
              {isRevealed ? char.toUpperCase() : '_'}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
        {word.length} letters
        {revealedIndices.size > 0 && (
          <span className="ml-2 text-green-600 dark:text-green-400">
            • {revealedIndices.size} hint{revealedIndices.size !== 1 ? 's' : ''} revealed
          </span>
        )}
      </div>
    </div>
  );
}
