"use client";

interface WordHintProps {
  word: string;
  reveal?: boolean;
}

const WordHint: React.FC<WordHintProps> = ({ word, reveal = false }) => {
  if (reveal) {
    return (
      <div className="flex flex-col items-center py-4">
        <span className="text-sm text-gray-600 dark:text-gray-400 mb-2">The word to draw:</span>
        <div className="font-bold text-2xl">{word}</div>
      </div>
    );
  }
  
  const hints = word.split('').map((letter) => 
    letter === ' ' ? ' ' : '_'
  );
  
  return (
    <div className="flex flex-col items-center py-4">
      <span className="text-sm text-gray-600 dark:text-gray-400 mb-2">Guess the word:</span>
      <div className="font-mono text-2xl tracking-widest">
        {hints.join(' ')}
      </div>
    </div>
  );
};

export default WordHint;