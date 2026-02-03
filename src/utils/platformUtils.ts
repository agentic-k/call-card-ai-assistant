/**
 * Platform detection utilities
 * 
 * Helper functions to detect the current platform/environment
 */

/**
 * Checks if the application is running in an Electron environment
 * @returns {boolean} True if running in Electron, false otherwise
 */
export const isElectron = (): boolean => {
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && (window.process as any)?.type === 'renderer') {
    return true;
  }

  // Main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true;
  }

  // Detect the user agent when the `nodeIntegration` option is set to false
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }

  return false;
};

/**
 * Checks if the application is running on a mobile device
 * @returns {boolean} True if running on a mobile device, false otherwise
 */
export const isMobile = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Gets the current environment from the meta tag
 * @returns {string} The current environment (e.g., 'development', 'production')
 */
export const getEnvironment = (): string => {
  const metaTag = document.querySelector('meta[name="environment"]');
  return metaTag?.getAttribute('content') || 'development';
};

/**
 * Checks if the application is running in a desktop browser (not Electron, not mobile)
 * @returns {boolean} True if running in a desktop browser, false otherwise
 */
export const isDesktopBrowser = (): boolean => {
  return !isElectron() && !isMobile();
}; 