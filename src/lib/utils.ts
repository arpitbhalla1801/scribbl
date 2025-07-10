// Utility functions for generating unique IDs

let messageIdCounter = 0;
let playerIdCounter = 0;

export function generateMessageId(): number {
  return ++messageIdCounter;
}

export function generatePlayerId(): string {
  return `player_${++playerIdCounter}_${Date.now()}`;
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateUniqueId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
