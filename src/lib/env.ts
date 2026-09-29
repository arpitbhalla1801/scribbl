/**
 * Environment variable validation
 * This ensures all required environment variables are present and valid
 */

interface EnvConfig {
  // Application URL (for CORS and redirects)
  NEXT_PUBLIC_APP_URL?: string;

  // Redis connection string - required in production (see store.ts)
  REDIS_URL?: string;

  // Secret used to sign player session cookies - required in production
  // (see session.ts)
  SESSION_SECRET?: string;

  // Node environment
  NODE_ENV: string;
}

/**
 * Validate and return typed environment variables
 */
export function getEnvConfig(): EnvConfig {
  const config: EnvConfig = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    REDIS_URL: process.env.REDIS_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  // Validate required variables for production
  if (config.NODE_ENV === 'production') {
    // Use placeholder if NEXT_PUBLIC_APP_URL is not set in production
    if (!config.NEXT_PUBLIC_APP_URL) {
      console.warn('⚠️  NEXT_PUBLIC_APP_URL is not set. Using platform URL or localhost as fallback');
      // Try to use platform-specific automatic URLs
      config.NEXT_PUBLIC_APP_URL =
        process.env.RENDER_EXTERNAL_URL || // Render
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || // Vercel
        process.env.RAILWAY_PUBLIC_DOMAIN || // Railway
        'http://localhost:3000'; // Fallback
    }

    // Validate URL format
    if (config.NEXT_PUBLIC_APP_URL) {
      try {
        new URL(config.NEXT_PUBLIC_APP_URL);
      } catch {
        throw new Error('NEXT_PUBLIC_APP_URL must be a valid URL');
      }
    }

    // Game state and sessions have nowhere to live without these in
    // production - store.ts and session.ts each also guard this at the
    // point they're used, this just surfaces one clear error earlier.
    const missing = ['REDIS_URL', 'SESSION_SECRET'].filter((key) => !config[key as keyof EnvConfig]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
    }
  }

  return config;
}

/**
 * Validate environment on server startup
 */
export function validateEnvironment(): void {
  try {
    const config = getEnvConfig();
    console.log('✓ Environment variables validated successfully');
    
    if (config.NODE_ENV === 'development') {
      console.log('Running in development mode');
    } else {
      console.log(`Running in ${config.NODE_ENV} mode`);
    }
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast
      process.exit(1);
    }
  }
}

// Export a singleton instance. Doesn't throw directly - Next evaluates this
// module during build-time page data collection (before real env vars are
// necessarily set), so validation failures go through validateEnvironment()
// instead, which is called explicitly at request time.
export const env: EnvConfig = (() => {
  try {
    return getEnvConfig();
  } catch {
    return { NODE_ENV: process.env.NODE_ENV || 'development' };
  }
})();
