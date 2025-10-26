// Cleanup interval in milliseconds (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Start the automated cleanup service for inactive games
 * This should be called once when the server starts
 */
export function startCleanupService() {
  if (cleanupTimer) {
    console.warn('Cleanup service is already running');
    return;
  }

  console.log('Starting game cleanup service...');
  
  // Import GameManager dynamically to avoid circular dependency
  const cleanupFunction = async () => {
    try {
      const { GameManager } = await import('./gameManager');
      GameManager.cleanupInactiveGames();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };
  
  // Run cleanup immediately on start
  cleanupFunction();
  
  // Set up periodic cleanup
  cleanupTimer = setInterval(() => {
    console.log('Running scheduled game cleanup...');
    cleanupFunction();
  }, CLEANUP_INTERVAL);

  // Ensure cleanup runs on process exit
  process.on('SIGTERM', stopCleanupService);
  process.on('SIGINT', stopCleanupService);
}

/**
 * Stop the cleanup service
 */
export function stopCleanupService() {
  if (cleanupTimer) {
    console.log('Stopping game cleanup service...');
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Manually trigger cleanup (useful for testing or admin actions)
 */
export async function triggerCleanup() {
  console.log('Manual cleanup triggered...');
  try {
    const { GameManager } = await import('./gameManager');
    GameManager.cleanupInactiveGames();
  } catch (error) {
    console.error('Error during manual cleanup:', error);
  }
}
