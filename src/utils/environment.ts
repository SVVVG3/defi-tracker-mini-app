/**
 * Environment utility functions
 * Provides consistent access to environment variables
 */

// Get an environment variable with a fallback value
export const getEnv = (
  key: string, 
  fallback: string = '', 
  required: boolean = false
): string => {
  // First try browser-safe NEXT_PUBLIC_ variables
  const browserKey = `NEXT_PUBLIC_${key}`;
  
  if (typeof process !== 'undefined' && process.env) {
    // Check for browser-safe variable first
    if (process.env[browserKey]) {
      return process.env[browserKey] as string;
    }
    
    // Then check for the regular variable
    if (process.env[key]) {
      return process.env[key] as string;
    }
  }
  
  // If variable is required and not found, throw error in development
  if (required && process.env.NODE_ENV === 'development') {
    console.error(`Required environment variable ${key} is missing!`);
  }
  
  return fallback;
};

// Environment variable specific getters
export const getZapperApiKey = (): string => {
  // Directly access the environment variable by name to avoid any issues with getEnv
  if (typeof process !== 'undefined' && process.env && process.env.ZAPPER_API_KEY) {
    return process.env.ZAPPER_API_KEY;
  }
  
  console.warn('ZAPPER_API_KEY not found in environment variables');
  return '';
};

// Check if we're running in a development environment
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

// Check if we're running in a production environment
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

// Export a default object with all functions
export default {
  getEnv,
  getZapperApiKey,
  isDevelopment,
  isProduction
}; 