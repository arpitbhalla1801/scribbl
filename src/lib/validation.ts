// Simple profanity filter
// In production, use a library like 'bad-words' or a more robust solution

const badWords = [
  // Add inappropriate words here
  // This is a minimal list - you should expand this
  'badword1',
  'badword2',
  // ... add more
];

// Common leetspeak substitutions
const leetSpeakMap: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
};

function normalizeLeetSpeak(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(char => leetSpeakMap[char] || char)
    .join('');
}

export function containsProfanity(text: string): boolean {
  const normalized = normalizeLeetSpeak(text.toLowerCase());
  
  // Remove spaces and special characters for checking
  const cleaned = normalized.replace(/[^a-z0-9]/g, '');
  
  return badWords.some(word => {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    return cleaned.includes(cleanWord) || normalized.includes(word);
  });
}

export function filterProfanity(text: string, replacement: string = '***'): string {
  if (!containsProfanity(text)) {
    return text;
  }
  
  let filtered = text;
  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, replacement);
  });
  
  return filtered;
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
