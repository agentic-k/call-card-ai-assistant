/**
 * Environment-aware redirect URI configuration
 * Supports local development, staging, and production environments
 */

/**
 * Get the appropriate redirect URI based on the current environment
 * @returns {string} The redirect URI for the current environment
 */
export function getRedirectUri() {
  const baseUrl = getBaseUrl();
  // Ensure there's no trailing dot from "callcard://."
  const cleanBaseUrl = baseUrl.endsWith('/.') ? baseUrl.slice(0, -2) : baseUrl;
  return `${cleanBaseUrl}/auth/callback`;
}

/**
 * Get the base URL for the application
 * @returns {string} The base URL for the current environment
 */
export function getBaseUrl() {
  const appBaseUrl = process.env.APP_BASE_URL;
  if (!appBaseUrl) {
    throw new Error(
      'APP_BASE_URL is not defined. Please set it in your environment variables.'
    );
  }
  return appBaseUrl;
}

/**
 * Get allowed origins for URL validation
 * @returns {string[]} Array of allowed origins
 */
export function getAllowedOrigins() {
  const baseUrl = getBaseUrl();
  const redirectUri = getRedirectUri();
  
  return [
    baseUrl,
    redirectUri,
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    // Add your production domain here
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ];
}

/**
 * Get the Supabase redirect URL for OAuth
 * @returns {string} The Supabase redirect URL
 */
export function getSupabaseRedirectUrl() {
  return getRedirectUri();
}
