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
  // replace the word with a hint. Compute the hint server-side (where the
  // real word and timing are both available) using getProgressiveHint, so
  // guessers gradually see letters as time passes - the same easing skribbl
  // uses. Doing this client-side isn't possible: by the time the word
  // reaches a non-drawer it must already be fully masked, so there'd be no
  // real letters left for the client to reveal from.
  if (
    sanitized.status === 'playing' &&
    sanitized.currentDrawer !== playerId &&
    sanitized.currentWord
  ) {
    sanitized.currentWord = getProgressiveHint(
      sanitized.currentWord,
      sanitized.settings.timePerRound,
      sanitized.timeRemaining
    );
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
 * Deterministic PRNG seeded from a string (mulberry32), so the same word
 * always produces the same shuffle order. This keeps the progressive
 * reveal below stable across repeated calls (the guesser polls ~once a
 * second) instead of jumping to different random letters each time.
 */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get revealed hint based on elapsed time.
 * Reveals letters progressively as time passes, always in the same order
 * for a given word (see seededRandom) so already-revealed letters never
 * "move" to a different position on a later call.
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

  // Deterministically shuffle (seeded by the word itself) and reveal the
  // first N - stable across repeated calls within the same round.
  const rand = seededRandom(word);
  const shuffled = [...letterPositions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const revealedPositions = new Set(shuffled.slice(0, Math.min(lettersToReveal, shuffled.length)));

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
