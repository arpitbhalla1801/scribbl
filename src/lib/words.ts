// Import the words array
import { words } from '../words/skribbl_words_array';

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

  // Skip the first two elements ("word", "count") and categorize the rest
  for (let i = 2; i < words.length; i++) {
    const word = words[i];
    if (typeof word === 'string') {
      if (word.length <= 4) {
        difficulty.easy.push(word);
      } else if (word.length <= 7) {
        difficulty.medium.push(word);
      } else {
        difficulty.hard.push(word);
      }
    }
  }

  return difficulty;
};

const wordsByDifficulty = categorizeWords();

export function getRandomWords(difficulty: 'easy' | 'medium' | 'hard', count: number = 1): string[] {
  const words = wordsByDifficulty[difficulty];
  const selectedWords: string[] = [];
  
  for (let i = 0; i < count && i < words.length; i++) {
    let randomWord: string;
    do {
      randomWord = words[Math.floor(Math.random() * words.length)];
    } while (selectedWords.includes(randomWord));
    
    selectedWords.push(randomWord);
  }
  
  return selectedWords;
}

export function getRandomWord(difficulty: 'easy' | 'medium' | 'hard'): string {
  return getRandomWords(difficulty, 1)[0];
}

export function getAllWords(): string[] {
  return [...wordsByDifficulty.easy, ...wordsByDifficulty.medium, ...wordsByDifficulty.hard];
}
