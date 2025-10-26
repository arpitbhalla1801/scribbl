// Server initialization - runs once when the server starts
import { startCleanupService } from './cleanupService';
import { validateEnvironment } from './env';

let initialized = false;

export function initializeServer() {
  if (initialized) {
    return;
  }

  console.log('Initializing server services...');
  
  // Validate environment variables
  validateEnvironment();
  
  // Start the cleanup service for inactive games
  startCleanupService();
  
  initialized = true;
}

// Don't auto-initialize to avoid circular dependency
// Will be called explicitly from API routes
