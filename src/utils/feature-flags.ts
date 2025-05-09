/**
 * Feature Flags Utility
 * 
 * This module provides utilities for checking feature flags and environment-specific behavior.
 */

/**
 * Checks if test endpoints should be enabled
 * This ensures test endpoints are only available in development by default,
 * but can be explicitly enabled/disabled via environment variable
 */
export function isTestEndpointsEnabled(): boolean {
  // If explicitly set via env var, use that value
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_ENDPOINTS !== undefined) {
    return process.env.NEXT_PUBLIC_ENABLE_TEST_ENDPOINTS === 'true';
  }
  
  // Otherwise, only enable in development
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if we're running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if we're running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Returns the base URL for the application
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
} 