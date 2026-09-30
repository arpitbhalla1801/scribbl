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
