/**
 * Word Management Utilities
 * 
 * Use these functions to manage and customize your word list
 */

import { drawableWords } from '../words/drawable_words';

/**
 * Filter words by category (based on common patterns)
 */
export function getWordsByCategory(category: string): string[] {
  const categories: Record<string, (word: string) => boolean> = {
    animals: (w) => /cat|dog|bird|fish|lion|tiger|bear|wolf|fox|deer|rabbit|elephant|giraffe|zebra|monkey|panda|penguin|dolphin|whale|shark|snake|frog|turtle|butterfly|bee|ant/i.test(w),
    food: (w) => /pizza|burger|cake|bread|cheese|meat|fruit|apple|banana|orange|grape|strawberry|cookie|candy|chocolate|coffee|tea|milk|juice|soup|salad|pasta|rice|egg/i.test(w),
    sports: (w) => /ball|soccer|football|basketball|tennis|golf|swim|run|jump|kick|throw|catch|race|goal|trophy|medal|olympics/i.test(w),
    nature: (w) => /tree|flower|mountain|river|ocean|beach|forest|rain|snow|sun|moon|star|cloud|wind|rainbow|volcano|island/i.test(w),
    vehicles: (w) => /car|bus|truck|bike|train|plane|boat|ship|rocket|helicopter|motorcycle|skateboard|scooter/i.test(w),
    household: (w) => /chair|table|bed|sofa|lamp|door|window|mirror|clock|phone|computer|television|radio|camera|book/i.test(w),
  };

  const filter = categories[category.toLowerCase()];
  if (!filter) return [];

  return drawableWords.filter(filter);
}

/**
 * Get words that contain specific substring
 */
export function searchWords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return drawableWords.filter(word => word.toLowerCase().includes(lowerQuery));
}

/**
 * Get random word from a specific category
 */
export function getRandomWordFromCategory(category: string): string | null {
  const categoryWords = getWordsByCategory(category);
  if (categoryWords.length === 0) return null;
  return categoryWords[Math.floor(Math.random() * categoryWords.length)];
}

/**
 * Validate if a word is in the drawable list
 */
export function isValidWord(word: string): boolean {
  return drawableWords.includes(word.toLowerCase());
}

/**
 * Get words by length range
 */
export function getWordsByLength(minLength: number, maxLength: number): string[] {
  return drawableWords.filter(word => word.length >= minLength && word.length <= maxLength);
}

/**
 * Get sample words for testing
 */
export function getSampleWords(count: number = 10): string[] {
  const shuffled = [...drawableWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Export word statistics
 */
export function getDetailedStats() {
  const lengthDistribution: Record<string, number> = {};
  
  drawableWords.forEach(word => {
    const length = word.length;
    lengthDistribution[length] = (lengthDistribution[length] || 0) + 1;
  });

  return {
    total: drawableWords.length,
    shortest: drawableWords.reduce((a, b) => a.length <= b.length ? a : b),
    longest: drawableWords.reduce((a, b) => a.length >= b.length ? a : b),
    averageLength: (drawableWords.reduce((sum, word) => sum + word.length, 0) / drawableWords.length).toFixed(2),
    lengthDistribution,
    categories: {
      animals: getWordsByCategory('animals').length,
      food: getWordsByCategory('food').length,
      sports: getWordsByCategory('sports').length,
      nature: getWordsByCategory('nature').length,
      vehicles: getWordsByCategory('vehicles').length,
      household: getWordsByCategory('household').length,
    }
  };
}

// Example usage:
// import { getWordsByCategory, getRandomWordFromCategory } from '@/lib/wordUtils';
// const animalWords = getWordsByCategory('animals');
// const randomAnimal = getRandomWordFromCategory('animals');
