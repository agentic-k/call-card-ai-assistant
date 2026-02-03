// main.mjs

import './config.mjs'; // Load environment variables first!
import { app, globalShortcut, screen, ipcMain, session as electronSession, BrowserWindow, nativeImage, shell } from 'electron';
import { initMain as initAudioLoopback } from 'electron-audio-loopback';
import path from 'path';
import url from 'url';
import fs from 'fs';
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';
import windowManager from './windows.mjs';
import { checkPermission, requestPermission, openSystemPreferences, PERMISSION_STATUS, revokePermission } from './permissions.mjs';
import trayManager from './tray.mjs';
import { setupIpcHandlers } from './ipc.mjs';
import supabase from './supabaseClient.mjs';
import AuthManager from './authIpc.mjs';
import { fileURLToPath } from 'url';


// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Custom Protocol Registration ---
// This is required for OAuth flow in packaged apps.
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('callcard', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('callcard');
}
// --- End Custom Protocol Registration ---

// Disable hardware acceleration to fix rendering issues
app.disableHardwareAcceleration();

// Add additional command-line switches to explicitly force software rendering and disable GPU features
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-rasterization');
app.commandLine.appendSwitch('disable-webgl');

// Initialize system audio loopback (must be called before the app is ready)
try {
  initAudioLoopback();
} catch (err) {
  // Silent error handling for production
}

// Determine if we are in development or production
const isDevelopment = (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) && !app.isPackaged;

// Set the application icon
function setAppIcon() {
  try {
    let iconPath;
    
    if (isDevelopment) {
      // In development, try multiple possible paths
      const possiblePaths = [
        path.join(__dirname, '..', 'public', 'icons', 'png', '1024x1024.png'),
        path.join(__dirname, '..', 'public', 'icon.png')
      ];
      
      // Use the first path that exists
      iconPath = possiblePaths.find(p => {
        try { return fs.existsSync(p); } catch (e) { return false; }
      });
      
      if (!iconPath) {
        iconPath = possiblePaths[0]; // Use the first path as fallback
      }
    } else {
      // In production, use the platform-specific icon
      const iconName = process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
      iconPath = path.join(process.resourcesPath, 'icons', process.platform === 'darwin' ? 'mac' : '', iconName);
    }
    
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        if (process.platform === 'darwin' && app.dock) {
          app.dock.setIcon(icon); // Only for macOS
        }
      }
    } else {
      // Try using the fallback icon in the public directory
      const fallbackIconPath = path.join(__dirname, '..', 'public', 'icon.png');
      if (fs.existsSync(fallbackIconPath)) {
        const fallbackIcon = nativeImage.createFromPath(fallbackIconPath);
        if (!fallbackIcon.isEmpty() && process.platform === 'darwin' && app.dock) {
          app.dock.setIcon(fallbackIcon);
        }
      }
    }
  } catch (error) {
    // Silent error handling for production
  }
}

async function toggleMainWindow() {
  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// Auto-updater setup (only in production)
try {
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: 'call-card/call-card'
    },
    updateInterval: '5 minutes',
  })
} catch (error) {
  // Don't let auto-updater failure prevent the app from starting
}

// In production, we need to adjust the path to look for the dist directory
const MAIN_APP_URL = isDevelopment 
  ? process.env.VITE_DEV_SERVER_URL 
  : url.format({
      pathname: path.join(app.getAppPath(), 'dist', 'index.html'),
      protocol: 'file:',
      slashes: true,
    });

// Global crash handlers
process.on('uncaughtException', (error) => {
  // Silent error handling for production
});

process.on('unhandledRejection', (reason) => {
  // Silent error handling for production
});

// Function to load the main app
async function loadContent(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  try {
    if (isDevelopment) {
      if (!process.env.VITE_DEV_SERVER_URL) {
        return;
      }
      await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      const prodPath = path.join(app.getAppPath(), 'dist', 'index.html');
      await mainWindow.loadFile(prodPath);
    }
  } catch (error) {
    // Silent error handling for production
  }
}

// Initialize the app: setup IPC, window, permissions, tray
async function initializeApp() {
  // 1. Create main window first
  let mainWindow;
  let authManager;
  try {
    mainWindow = windowManager.createMainWindow();
    
    // Create AuthManager instance
    authManager = new AuthManager(mainWindow, supabase);

    // Listen for when the main window's web contents are available
    mainWindow.webContents.on('did-finish-load', () => {
      // Main window content finished loading
    });

  } catch (err) {
    return; // Critical error, cannot proceed
  }

  // 2. Setup login handler and other initializers
  try {
    // Note: Custom protocol handling removed - we now use localhost redirects for OAuth
    // The OAuth flow is handled entirely through the AuthManager in authIpc.mjs
    
    // IPC handler for external auth token
    ipcMain.on('set-external-auth-token', async (event, accessToken, refreshToken) => {
      try {
        // Use the tokens to set up a session with Supabase
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          const mainWindow = windowManager.getMainWindow();
          if (mainWindow) {
            mainWindow.webContents.send('auth-error', error.message);
          }
          return;
        }
        
        // Send success message to renderer
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && data.session) {
          mainWindow.webContents.send('auth-callback', {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
          });
        }
      } catch (err) {
        // Silent error handling for production
      }
    });

  } catch (err) {
    // Silent error handling for production
  }

  // 3. Setup IPC handlers
  try {
    const permissionsApi = { 
      requestPermission, 
      openSystemPreferences, 
      checkPermission, 
      PERMISSION_STATUS,
      loadContent,
      MAIN_APP_URL,
      revokePermission,
      authManager,
    };
    
    setupIpcHandlers(windowManager, permissionsApi);

  } catch (err) {
    // Silent error handling for production
  }

  // 4. Load main app
  try {
    if (mainWindow) {
      await loadContent(mainWindow);
    }
  } catch (err) {
    // Silent error handling for production
  }

  // 5. Create tray icon
  try {
    trayManager.createTray(app, windowManager);
  } catch (err) {
    // Silent error handling for production
  }
}

// Wait for the app to be ready before initializing
app.whenReady().then(() => {
  // Set the application icon
  setAppIcon();
  
  // Register global shortcut first
  const success = globalShortcut.register('CommandOrControl+Shift+M', () => {
    toggleMainWindow();
  });
  if (!success) {
    // Silent error handling for production
  }

  initializeApp().catch((error) => {
    // Fallback: only create window/tray if none exists and app is ready
    if (app.isReady() && !windowManager.getMainWindow()) {
      try {
        const mw = windowManager.createMainWindow();
        if (mw) {
          // Add focus listener here too for fallback created window
          mw.on('focus', () => {
            if (mw.webContents.getURL() === MAIN_APP_URL) {
              loadContent(mw);
            }
          });
          loadContent(mw).catch(err => {
            // Silent error handling for production
          });
        }
        trayManager.createTray(app, windowManager);
      } catch (err) {
        // Silent error handling for production
      }
    }
  });

  // Handle the 'open-url' event for the custom protocol (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    // No need to do anything here. The AuthManager's `will-navigate` event
    // on the authWindow will automatically pick up the redirect.
    // This handler's purpose is to ensure the app can receive the URL event.
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, recreate window when dock icon is clicked
app.on('activate', () => {
  let mw = windowManager.getMainWindow();
  if (!mw) {
    try {
      mw = windowManager.createMainWindow();
      // Add focus listener for reactivated window
      mw.on('focus', () => {
        if (mw.webContents.getURL() === MAIN_APP_URL) {
          loadContent(mw);
        }
      });
    } catch (err) {
      return;
    }
  }
  // After creating or getting the window, ensure content is loaded correctly based on permissions
  if (mw) {
    if (!mw.isVisible()) {
      mw.show();
    } else {
      mw.focus(); // Ensure it has focus to trigger the focus listener if needed
    }
    if (mw.webContents.getURL() !== MAIN_APP_URL) {
        loadContent(mw).catch(err => {
          // Silent error handling for production
        });
    }
  }
});

// Clean up tray before quitting
app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
    trayManager.destroyTray();
  } catch (err) {
    // Silent error handling for production
  }
});
