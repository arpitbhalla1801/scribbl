// Server initialization - runs once when the server starts
import { validateEnvironment } from './env';
import { logger } from './logger.ts';

let initialized = false;

export function initializeServer() {
  if (initialized) {
    return;
  }

  logger.info('Initializing server services');

  // Validate environment variables
  validateEnvironment();

  initialized = true;
}

// Don't auto-initialize to avoid circular dependency
// Will be called explicitly from API routes
