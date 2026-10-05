// Profanity filter, via the maintained `obscenity` dataset/matcher rather
// than a hand-rolled wordlist. The recommended transformers already handle
// leetspeak ("sh1t") and confusable characters.
import { RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers, fixedPhraseCensorStrategy } from 'obscenity';

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export function containsProfanity(text: string): boolean {
  return matcher.hasMatch(text);
}

export function filterProfanity(text: string, replacement: string = '***'): string {
  const matches = matcher.getAllMatches(text);
  if (matches.length === 0) return text;

  const censor = new TextCensor().setStrategy(fixedPhraseCensorStrategy(replacement));
  return censor.applyTo(text, matches);
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Username cannot be empty' };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be less than 20 characters' };
  }
  
  if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' };
  }
  
  if (containsProfanity(trimmed)) {
    return { valid: false, error: 'Username contains inappropriate content' };
  }
  
  return { valid: true };
}

// #50: a custom word pack needs at least 3 words (one per word-choice slot)
// and a sane cap so a room doesn't ship a megabyte of settings.
export function validateCustomWords(words: unknown): { valid: boolean; error?: string; words?: string[] } {
  if (!Array.isArray(words)) {
    return { valid: false, error: 'Custom words must be a list' };
  }

  const cleaned = Array.from(new Set(
    words
      .filter((w): w is string => typeof w === 'string')
      .map(w => w.trim().toLowerCase())
      .filter(Boolean)
  ));

  if (cleaned.length < 3) {
    return { valid: false, error: 'Custom word pack needs at least 3 unique words' };
  }
  if (cleaned.length > 100) {
    return { valid: false, error: 'Custom word pack can have at most 100 words' };
  }
  if (cleaned.some(w => w.length > 24 || !/^[a-z0-9' -]+$/.test(w))) {
    return { valid: false, error: 'Words can only contain letters, numbers, spaces, hyphens, and apostrophes' };
  }
  if (cleaned.some(w => containsProfanity(w))) {
    return { valid: false, error: 'Custom word pack contains inappropriate content' };
  }

  return { valid: true, words: cleaned };
}

export function validateRoomId(roomId: string): boolean {
  return /^[A-Z0-9]{6}$/.test(roomId);
}

export function sanitizeMessage(message: string): string {
  // Basic XSS prevention
  return message
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .substring(0, 200); // Limit length
}
