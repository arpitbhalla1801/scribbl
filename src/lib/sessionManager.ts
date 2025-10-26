/**
 * Player session management for reconnection support
 */

interface PlayerSession {
  playerId: string;
  playerName: string;
  roomId: string;
  timestamp: number;
}

const STORAGE_KEY = 'scribbl_player_session';
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save player session to localStorage
 */
export function savePlayerSession(roomId: string, playerId: string, playerName: string): void {
  if (typeof window === 'undefined') return;
  
  const session: PlayerSession = {
    playerId,
    playerName,
    roomId,
    timestamp: Date.now(),
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save player session:', error);
  }
}

/**
 * Get saved player session from localStorage
 */
export function getPlayerSession(roomId: string): PlayerSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const session: PlayerSession = JSON.parse(stored);
    
    // Check if session is for the same room
    if (session.roomId !== roomId) return null;
    
    // Check if session has expired
    if (Date.now() - session.timestamp > SESSION_EXPIRY) {
      clearPlayerSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to get player session:', error);
    return null;
  }
}

/**
 * Clear player session from localStorage
 */
export function clearPlayerSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear player session:', error);
  }
}

/**
 * Check if a player session exists for a room
 */
export function hasPlayerSession(roomId: string): boolean {
  return getPlayerSession(roomId) !== null;
}
