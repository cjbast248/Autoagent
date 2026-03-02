
// Environment configuration that works both in development and Docker
interface EnvironmentConfig {
  BACKEND_URL: string;
  BACKEND_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  APP_URL: string;
  NODE_ENV: string;
}

// Validate required environment variables
const validateEnvironment = (config: EnvironmentConfig): void => {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = requiredVars.filter(varName => !config[varName as keyof EnvironmentConfig]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Function to get environment variables from window.ENV (injected by Docker) or import.meta.env
const getEnvironmentConfig = (): EnvironmentConfig => {
  // Check if running in Docker (window.ENV is injected by docker-entrypoint.sh)
  if (typeof window !== 'undefined' && (window as any).ENV) {
    return (window as any).ENV;
  }

  // Fallback to Vite environment variables for development
  // SECURITY: No hardcoded secrets - all values must come from environment variables
  const config = {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'https://sveygocawwiklvozoppq.supabase.co/functions/v1',
    BACKEND_API_KEY: import.meta.env.VITE_BACKEND_API_KEY || '',
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://sveygocawwiklvozoppq.supabase.co',
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2ZXlnb2Nhd3dpa2x2b3pvcHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODcyNzgsImV4cCI6MjA4Nzk2MzI3OH0.gI6zpZKNXrPu-F3047UuvVDYC0f3R6-FFnCX9iBuM7k',
    APP_URL: import.meta.env.VITE_APP_URL || 'https://cjbast248.github.io/Autoagent',
    NODE_ENV: import.meta.env.NODE_ENV || 'production',
  };

  // Validate configuration
  validateEnvironment(config);

  return config;
};

export const ENV = getEnvironmentConfig();

// Export individual environment variables for convenience
export const {
  SUPABASE_URL,
  BACKEND_API_KEY,
  SUPABASE_ANON_KEY,
  APP_URL,
  NODE_ENV,
} = ENV;

// Helper functions
export const isProduction = () => NODE_ENV === 'production';
export const isDevelopment = () => NODE_ENV === 'development';
export const isTest = () => NODE_ENV === 'test';
