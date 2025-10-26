import { GameState } from './types';

/**
 * Sanitize game state for a specific player
 * This prevents cheating by hiding the current word from non-drawing players
 */
export function sanitizeGameStateForPlayer(
  gameState: GameState,
  playerId: string
): GameState {
  // Create a shallow copy of the game state
  const sanitized = { ...gameState };

  // If in word selection phase, hide choices from non-drawers
  if (sanitized.status === 'word-selection' && sanitized.currentDrawer !== playerId) {
    sanitized.wordChoices = undefined;
  }

  // If the game is playing and the player is not the current drawer,
  // hide the current word
  if (
    sanitized.status === 'playing' &&
    sanitized.currentDrawer !== playerId &&
    sanitized.currentWord
  ) {
    // Replace the word with a hint showing length and spaces
    sanitized.currentWord = createWordHint(sanitized.currentWord);
  }

  return sanitized;
}

/**
 * Create a hint from a word (e.g., "hello world" -> "_ _ _ _ _   _ _ _ _ _")
 */
function createWordHint(word: string): string {
  return word
    .split('')
    .map(char => {
      if (char === ' ') return '   '; // Three spaces for word separator
      return '_';
    })
    .join(' ');
}

/**
 * Get revealed hint based on elapsed time
 * Reveals letters progressively as time passes
 */
export function getProgressiveHint(
  word: string,
  timePerRound: number,
  timeRemaining: number
): string {
  const elapsed = timePerRound - timeRemaining;
  const totalTime = timePerRound;
  
  // Start revealing after 50% of time has passed
  if (elapsed < totalTime * 0.5) {
    return createWordHint(word);
  }
  
  // Calculate how many letters to reveal
  const progress = (elapsed - totalTime * 0.5) / (totalTime * 0.5);
  const lettersToReveal = Math.floor(word.replace(/\s/g, '').length * progress * 0.5);
  
  // Get positions of letters (excluding spaces)
  const letterPositions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== ' ') {
      letterPositions.push(i);
    }
  }
  
  // Randomly select positions to reveal
  const revealedPositions = new Set<number>();
  const shuffled = [...letterPositions].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(lettersToReveal, shuffled.length); i++) {
    revealedPositions.add(shuffled[i]);
  }
  
  // Build hint with some letters revealed
  return word
    .split('')
    .map((char, index) => {
      if (char === ' ') return '   ';
      if (revealedPositions.has(index)) return char;
      return '_';
    })
    .join(' ');
}
