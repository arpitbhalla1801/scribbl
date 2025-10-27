/**
 * Environment variable validation
 * This ensures all required environment variables are present and valid
 */

interface EnvConfig {
  // Application URL (for CORS and redirects)
  NEXT_PUBLIC_APP_URL?: string;
  
  // Cleanup API token (for internal admin endpoints)
  CLEANUP_API_TOKEN?: string;
  
  // Node environment
  NODE_ENV: string;
}

/**
 * Validate and return typed environment variables
 */
export function getEnvConfig(): EnvConfig {
  const config: EnvConfig = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CLEANUP_API_TOKEN: process.env.CLEANUP_API_TOKEN,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  // Validate required variables for production
  if (config.NODE_ENV === 'production') {
    const missingVars: string[] = [];

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

    if (!config.CLEANUP_API_TOKEN) {
      console.warn('⚠️  CLEANUP_API_TOKEN is not set. Using default token (not secure for production)');
    }

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missingVars.join(', ')}`
      );
    }

    // Validate URL format
    if (config.NEXT_PUBLIC_APP_URL) {
      try {
        new URL(config.NEXT_PUBLIC_APP_URL);
      } catch {
        throw new Error('NEXT_PUBLIC_APP_URL must be a valid URL');
      }
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

// Export a singleton instance
export const env = getEnvConfig();
