import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getRedirectUri } from './config/redirects.mjs';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Handles Google OAuth flow within Electron, managing the popup window and
 * sending authentication tokens back to the renderer process.
 */
class AuthManager {
  constructor(mainWindow, supabase) {
    this.mainWindow = mainWindow;
    this.authWindow = null;
    this.supabase = supabase;
    this.authInProgress = false; // Track if auth flow is active
    this.authTimeoutId = null;   // To store timeout ID
  }

  /**
   * Opens a new BrowserWindow for OAuth authentication.
   * @param {string} authUrl The URL provided by Supabase for OAuth redirect.
   */
  async openAuthWindow(authUrl) {
    if (this.authWindow && !this.authWindow.isDestroyed()) {
      this.authWindow.focus();
      return;
    }

    // Clean up any existing window
    this.cleanupAuthWindow();

    // Resolve the preload script path relative to the app root
    const preloadPath = path.resolve(__dirname, 'auth-preload.js');

    this.authInProgress = true; // Auth flow starts

    this.authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      show: false,
      parent: this.mainWindow,
      modal: false,
      minimizable: false, // Disable minimize button
      maximizable: true, // Disable maximize button
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: preloadPath,
      },
    });

    // Set a timeout for the auth process
    this.authTimeoutId = setTimeout(() => {
      if (this.authWindow && !this.authWindow.isDestroyed()) {
        this.authInProgress = false; // Prevent 'closed' handler from firing
        this.mainWindow.webContents.send('auth-error', 'Authentication timed out.');
        this.closeAuthWindow();
      }
    }, 5 * 60 * 1000); // 5-minute timeout

    // Handle navigation events
    this.authWindow.webContents.on('will-navigate', (event, newUrl) => {
      this.handleUrlChange(event, newUrl);
    });

    this.authWindow.webContents.on('will-redirect', (event, newUrl) => {
      this.handleUrlChange(event, newUrl);
    });

    // Handle errors
    this.authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      try {
        const url = event.sender?.getURL() || 'unknown';
        if (url.includes('error=interaction_required')) {
          this.mainWindow.webContents.send('auth-error', 'Google sign-in requires interaction');
          this.closeAuthWindow();
        } else if (!url.startsWith('https://accounts.google.com')) {
          // This can happen if the localhost server isn't running and the redirect fails.
          this.mainWindow.webContents.send('auth-error', `Authentication failed: Could not connect to the authentication server. Please try again.`);
          this.closeAuthWindow();
        }
      } catch (error) {
        this.mainWindow.webContents.send('auth-error', 'Authentication failed due to an unexpected error.');
        this.closeAuthWindow();
      }
    });

    // Load the auth URL
    try {
      await this.authWindow.loadURL(authUrl);
      this.authWindow.show();
    } catch (error) {
      this.mainWindow.webContents.send('auth-error', 'Failed to open authentication window');
      this.closeAuthWindow();
    }

    // Handle window closed event (user manually closing the window)
    this.authWindow.on('closed', () => {
      // If closed by user while auth is in progress
      if (this.authInProgress) {
        this.mainWindow.webContents.send('auth-error', 'Authentication cancelled by user.');
      }
      this.cleanupAuthWindow();
    });
  }

  /**
   * Safely closes the auth window
   */
  closeAuthWindow() {
    if (this.authWindow && !this.authWindow.isDestroyed()) {
      // Hide the window first to avoid visual glitches
      this.authWindow.hide();
      
      // Use setImmediate to close the window in the next tick
      setImmediate(() => {
        try {
          this.authWindow.close();
        } catch (error) {
          // Ignore any errors during window close
        }
        this.cleanupAuthWindow();
      });
    }
  }

  /**
   * Cleans up auth window references
   */
  cleanupAuthWindow() {
    if (this.authTimeoutId) {
      clearTimeout(this.authTimeoutId);
      this.authTimeoutId = null;
    }
    if (this.authWindow) {
      // Remove all listeners
      this.authWindow.removeAllListeners();
      this.authWindow = null;
    }
    this.authInProgress = false; // Reset flag
  }

  /**
   * Handles URL changes during the OAuth flow. This is the core of the PKCE flow for Electron.
   * It intercepts the redirect back from Supabase and passes the full URL to the renderer
   * process to handle the PKCE code exchange, since the renderer has the code verifier.
   * @param {Event} event The navigation event
   * @param {string} newUrl The new URL being navigated to
   */
  async handleUrlChange(event, newUrl) {
    try {
      const url = new URL(newUrl);

      // Check for explicit errors from the provider in the URL (e.g., user denies access)
      const error = url.searchParams.get('error');
      if (error) {
        event.preventDefault();
        const errorDescription = url.searchParams.get('error_description') || error;
        this.mainWindow.webContents.send('auth-error', errorDescription);
        this.closeAuthWindow();
        return;
      }
      
      // Check for the PKCE code if the URL matches our redirect URI
      const REDIRECT_URI_BASE = getRedirectUri();
      if (newUrl.startsWith(REDIRECT_URI_BASE)) {
        const authCode = url.searchParams.get('code');

        if (authCode) {
          event.preventDefault(); // Stop the window from trying to load the localhost URL
          
          try {
            // Exchange the code for a session IN THE MAIN PROCESS. This is critical for PKCE.
            // The same Supabase client instance that started the flow must finish it.
            const { data, error: exchangeError } = await this.supabase.auth.exchangeCodeForSession(authCode);

            if (exchangeError) {
              this.mainWindow.webContents.send('auth-error', `Failed to exchange code for session: ${exchangeError.message}`);
              this.closeAuthWindow();
              return;
            }

            if (!data.session) {
              this.mainWindow.webContents.send('auth-error', 'Authentication failed: No session returned after code exchange.');
              this.closeAuthWindow();
              return;
            }
            
            // Send the session data to the renderer process in the expected format
            this.mainWindow.webContents.send('auth-callback', {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_in: data.session.expires_in,
              provider_token: data.session.provider_token,
              provider_refresh_token: data.session.provider_refresh_token,
            });
            
            this.authInProgress = false; // Mark auth as complete
            this.closeAuthWindow();
            
          } catch (error) {
            this.mainWindow.webContents.send('auth-error', `Unexpected error during authentication: ${error.message}`);
            this.closeAuthWindow();
          }
        } else {
          this.mainWindow.webContents.send('auth-error', 'No authorization code found in callback URL.');
          this.closeAuthWindow();
        }
      }
    } catch (error) {
      this.mainWindow.webContents.send('auth-error', 'An unexpected error occurred during authentication.');
      this.closeAuthWindow();
    }
  }

  /**
   * Logs the user out by deleting the stored session.
   * This is called from the main IPC handler.
   */
  async logout() {
    try {
      // Close the auth window if it's open
      if (this.authWindow) {
        this.closeAuthWindow();
      }

      // Notify the renderer process to initiate its own sign-out
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('initiate-renderer-sign-out');
      } else {
        return { error: { message: 'Main window not available' } };
      }

      return { error: null };
    } catch (err) {
      return { error: { message: err.message || 'An unexpected error occurred during sign out' } };
    }
  }
}

export default AuthManager; 