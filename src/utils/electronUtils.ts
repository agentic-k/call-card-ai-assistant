/**
 * Utility functions for Electron integration
 */

/**
 * Checks if the application is running in Electron
 */
export const isElectron = (): boolean => {
  // Check if window.electron exists (our exposed API)
  return window.electron !== undefined;
};

/**
 * Opens the desktop app with specific URL parameters
 * @param path - The path to navigate to in the desktop app
 * @param accessToken - Optional access token to pass for automatic login
 * @param refreshToken - Optional refresh token to pass for automatic login
 */
export const openInDesktop = (path?: string, accessToken?: string, refreshToken?: string): void => {
  // Create the base URL for the desktop app - use environment-aware URL
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://127.0.0.1:8080';
  let url = path ? `${baseUrl}/${path}` : baseUrl;
  
  // Add auth tokens if provided
  if (accessToken) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}access_token=${encodeURIComponent(accessToken)}`;
  }
  if (refreshToken) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}refresh_token=${encodeURIComponent(refreshToken)}`;
  }
  
  // Try to open the URL which should trigger the desktop app
  window.location.href = url;
};
