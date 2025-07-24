"use client";

interface WordHintProps {
  word: string;
  reveal?: boolean;
}

const WordHint: React.FC<WordHintProps> = ({ word, reveal = false }) => {
  if (reveal) {
    return (
      <div className="card text-center py-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Your word to draw:
        </div>
        <div className="font-bold text-xl text-gray-900 dark:text-gray-100">
          "{word}"
        </div>
      </div>
    );
  }
  
  const hints = word.split('').map((letter, index) => 
    letter === ' ' ? (
      <span key={index} className="inline-block w-4"></span>
    ) : (
      <span 
        key={index} 
        className="inline-block w-6 h-8 border-b-2 border-gray-300 dark:border-gray-600 mx-1 text-center font-mono text-lg text-gray-400 dark:text-gray-500"
      >
        _
      </span>
    )
  );
  
  return (
    <div className="card text-center py-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Guess the word:
      </div>
      <div className="flex items-center justify-center flex-wrap gap-1 mb-2">
        {hints}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500">
        {word.length} letter{word.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default WordHint;