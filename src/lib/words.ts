// Import the curated drawable words array
import { drawableWords } from '../words/drawable_words.ts';
import { logger } from './logger.ts';

interface WordDifficulty {
  easy: string[];
  medium: string[];
  hard: string[];
}

// Categorize words by difficulty based on length and complexity
const categorizeWords = (): WordDifficulty => {
  const difficulty: WordDifficulty = {
    easy: [],
    medium: [],
    hard: []
  };

  // Categorize drawable words by length
  for (const word of drawableWords) {
    if (word.length <= 5) {
      difficulty.easy.push(word);
    } else if (word.length <= 8) {
      difficulty.medium.push(word);
    } else {
      difficulty.hard.push(word);
    }
  }

  return difficulty;
};

const wordsByDifficulty = categorizeWords();

// Picks `count` distinct random words from `pool`, without replacement.
export function pickRandomWords(pool: string[], count: number): string[] {
  const selectedWords: string[] = [];

  for (let i = 0; i < count && i < pool.length; i++) {
    let randomWord: string;
    do {
      randomWord = pool[Math.floor(Math.random() * pool.length)];
    } while (selectedWords.includes(randomWord));

    selectedWords.push(randomWord);
  }

  return selectedWords;
}

export function getRandomWords(difficulty: 'easy' | 'medium' | 'hard', count: number = 1): string[] {
  return pickRandomWords(wordsByDifficulty[difficulty], count);
}

export function getRandomWord(difficulty: 'easy' | 'medium' | 'hard'): string {
  return getRandomWords(difficulty, 1)[0];
}

export function getAllWords(): string[] {
  return [...wordsByDifficulty.easy, ...wordsByDifficulty.medium, ...wordsByDifficulty.hard];
}

// Get word stats for debugging/info
export function getWordStats() {
  return {
    total: drawableWords.length,
    easy: wordsByDifficulty.easy.length,
    medium: wordsByDifficulty.medium.length,
    hard: wordsByDifficulty.hard.length,
  };
}

// Log word stats for verification
if (typeof window === 'undefined') {
  logger.info('Drawable words loaded', getWordStats());
}
