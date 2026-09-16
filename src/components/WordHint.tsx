"use client";

interface WordHintProps {
  word: string;
  reveal?: boolean;
}

const WordHint: React.FC<WordHintProps> = ({ word, reveal = false }) => {
  if (reveal) {
    return (
      <div className="card text-center py-4 px-4">
        <div className="text-sm font-semibold text-secondary mb-1">
          Your word to draw
        </div>
        <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--marker-blue)' }}>
          {word}
        </div>
      </div>
    );
  }

  // word arrives already progressively hinted by the server (see
  // gameStateSanitizer.getProgressiveHint) - some letters may already be
  // revealed here, growing as the round goes on. Just render it as-is.
  const hints = word.split(' ').map((segment, segmentIndex) => (
    <div key={segmentIndex} className="flex gap-1.5">
      {segment.split('').map((char, charIndex) =>
        char === '_' ? (
          <span
            key={`${segmentIndex}-${charIndex}`}
            className="inline-flex items-center justify-center w-7 h-9 rounded-md text-center text-lg font-bold border-b-4"
            style={{ borderColor: 'var(--ink)', color: 'transparent' }}
          >
            _
          </span>
        ) : (
          <span
            key={`${segmentIndex}-${charIndex}`}
            className="inline-flex items-center justify-center w-7 h-9 rounded-md text-center text-lg font-bold border-b-4 animate-pop-in"
            style={{ borderColor: 'var(--marker-green)', color: 'var(--marker-green)' }}
          >
            {char.toUpperCase()}
          </span>
        )
      )}
    </div>
  ));

  return (
    <div className="card text-center py-4 px-4">
      <div className="text-sm font-semibold text-secondary mb-3">
        Guess the word
      </div>
      <div className="flex items-center justify-center flex-wrap gap-2 mb-2">
        {hints}
      </div>
      <div className="text-xs text-muted">
        {word.replace(/\s/g, '').length} letter{word.replace(/\s/g, '').length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default WordHint;
