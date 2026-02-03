import { ipcMain, BrowserWindow, screen, Notification } from 'electron';
import { app } from 'electron';
import path from 'path';
import url from 'url';
import fs from 'fs';
import supabase from './supabaseClient.mjs';
import { getSupabaseRedirectUrl } from './config/redirects.mjs';

// Fix for __dirname in ES modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our utility modules
import { saveAudioFile, openAudioFile, getAudioSources } from './utils/audio.mjs';
import notificationUtils from './utils/notification.mjs';
import transcriptionUtils from './utils/transcription.mjs';
import textClassifierUtils from './utils/textClassifier.mjs';
import { setupGoogleCalendar } from './api/user-google-tokens.mjs';

// The 'permissions' parameter is now an object with specific functions and constants
function setupIpcHandlers(windowManager, api) {
  const { 
    requestPermission, 
    openSystemPreferences, 
    checkPermission, 
    PERMISSION_STATUS,
    loadContent,
    MAIN_APP_URL,
    revokePermission,
    setMeetingState,
    authManager,
  } = api;

  // Listen for meeting state updates from the renderer process
  ipcMain.on('update-meeting-state', (event, meetingData) => {
    if (setMeetingState) {
      setMeetingState(meetingData);
    }
  });

  // Audio processor path handler
  ipcMain.handle('get-audio-processor-path', () => {
    const isDevelopment = (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) && !app.isPackaged;
    
    if (isDevelopment) {
      // In development, serve from the electron directory
      return path.join(__dirname, 'audio-processor.js');
    } else {
      // In production, try multiple possible locations for the audio processor
      const possiblePaths = [
        path.join(app.getAppPath(), 'audio-processor.js'),           // Direct app path
        path.join(process.resourcesPath, 'audio-processor.js'),      // Resources folder
        path.join(app.getAppPath(), '..', 'audio-processor.js'),     // Parent of app.asar
        path.join(app.getAppPath(), 'dist', 'audio-processor.js'),   // Inside dist
      ];
      
      // Check each path and return the first one that exists
      for (const audioPath of possiblePaths) {
        if (fs.existsSync(audioPath)) {
          return audioPath;
        }
      }
      
      // If none exist, return the first path for error handling
      return possiblePaths[0];
    }
  });

  // Audio file handlers
  ipcMain.handle('save-audio-file', (event, base64Data) => {
    return saveAudioFile(base64Data);
  });
  
  ipcMain.on('open-audio-file', (event, filePath) => {
    openAudioFile(filePath);
  });

  // Add desktop-capturer handlers for audio
  ipcMain.handle('desktop-capturer-get-sources', async (event, options) => {
    try {
      const { desktopCapturer } = require('electron');
      // Only get audio sources
      const sources = await desktopCapturer.getSources({ 
        types: ['audio'], // Corrected: types should be an array, ensure this is what you intend
        fetchWindowIcons: true
      });
      return sources;
    } catch (error) {
      return [];
    }
  });

  // Audio source handlers
  ipcMain.on('get-audio-sources', async (event) => {
    const sources = await getAudioSources();
    event.sender.send('audio-sources', sources);
  });

  // Window control handlers
  ipcMain.on('minimize', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) mainWindow.close();
  });

  // Window-specific control handlers - generic handlers for any window
  ipcMain.on('minimize-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.minimize();
  });

  ipcMain.on('maximize-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.on('close-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.close();
  });

  // Call Card specific handlers (unused)
  // ipcMain.on('toggle-floating-window', () => {
  //   windowManager.toggleFloatingWindow();
  // });

  // ipcMain.on('floating-window-close', () => {
  //   windowManager.closeFloatingWindow();
  // });

  // Meeting window handlers
  ipcMain.on('minimize-meeting-window', () => {
    windowManager.minimizeMeetingWindow();
  });

  ipcMain.on('reset-window-size', () => {
    windowManager.resetWindowSize();
  });

  ipcMain.on('start-meeting', () => {
    try {
      const compactWindow = windowManager.activeMeetingWindow();
      if (!compactWindow) {
        return;
      }
      // Ensure window is visible and focused
      compactWindow.show();
      compactWindow.focus();
    } catch (error) {
      // Silent error handling for production
    }
  });

  ipcMain.on('minimize-and-position-window', () => {
    windowManager.activeMeetingWindow();
  });

  ipcMain.on('restore-main-window', () => {
    windowManager.restoreMainWindow();
  });

  ipcMain.on('end-meeting', () => {
    windowManager.restoreMainWindow();
  });

  // Meet transcription handlers
  ipcMain.on('toggle-transcribe-window', () => {
    windowManager.toggleTranscriberWindow();
  });

  ipcMain.on('transcribe-window-close', () => {
    windowManager.closeTranscriberWindow();
  });

  // Transcription start/stop handlers
  ipcMain.on('start-transcription', (event) => {
    // When transcription starts, we want to notify all windows
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('transcription-started');
    }
    
    // const floatingWindow = windowManager.getFloatingWindow();
    // if (floatingWindow) {
    //   floatingWindow.webContents.send('transcription-started');
    // }
    
    // Start transcription
    transcriptionUtils.startTranscription(event.sender);
  });
  
  ipcMain.on('stop-transcription', (event) => {
    // When transcription stops, we want to notify all windows
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('transcription-stopped');
    }
    
    // const floatingWindow = windowManager.getFloatingWindow();
    // if (floatingWindow) {
    //   floatingWindow.webContents.send('transcription-stopped');
    // }
    
    // Stop transcription
    transcriptionUtils.stopTranscription();
    
  });

  // Generic permission handlers used by PermissionGate and other parts of the app
  ipcMain.handle('check-permission', async (event, permissionType) => {
    if (checkPermission) {
      return checkPermission(permissionType);
    }
    return PERMISSION_STATUS ? PERMISSION_STATUS.NOT_DETERMINED : 'not-determined';
  });

  ipcMain.handle('request-permission', async (event, permissionType) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    
    if (requestPermission) {
      try {
        const granted = await requestPermission(permissionType, window);
        return granted;
      } catch (error) {
        return false;
      }
    } else {
      return false;
    }
  });
  
  ipcMain.handle('revoke-permission', async (event, permissionType) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (revokePermission) {
      return await revokePermission(permissionType, window);
    }
    return false;
  });
  
  ipcMain.on('open-system-preferences', (event, permissionType) => {
    if (openSystemPreferences) {
      openSystemPreferences(permissionType);
    }
  });

  // Handle app quit from renderer
  ipcMain.on('app-quit', () => {
    app.quit();
  });

  // Add a sign-out handler to ensure the main process session is cleared
  ipcMain.handle('sign-out', async () => {
    if (authManager) {
      return authManager.logout();
    }
    return { error: { message: 'Authentication manager not available.' } };
  });

  // Add handler for opening auth window
  ipcMain.on('open-auth-window', async (event, authUrl) => {
    if (authManager) {
      try {
        await authManager.openAuthWindow(authUrl);
      } catch (error) {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('auth-error', error.message);
        }
      }
    } else {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('auth-error', 'Authentication manager not available.');
      }
    }
  });

  // Add handler for initiating Google OAuth from main process
  ipcMain.handle('initiate-google-oauth', async () => {
    if (!authManager) {
      throw new Error('Authentication manager not available');
    }

    try {
      // Use the main process Supabase client to initiate OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getSupabaseRedirectUrl(),
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('No OAuth URL received from Supabase');
      }

      const cleanUrl = data.url.replace(/\s/g, '%20');
      
      // Open the auth window with the URL
      await authManager.openAuthWindow(cleanUrl);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  // Add handler for initiating Google Calendar linking
  ipcMain.handle('initiate-google-calendar-linking', async () => {
    if (!authManager) {
      throw new Error('Authentication manager not available');
    }

    try {
      // Use the main process Supabase client to initiate OAuth with calendar scopes
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getSupabaseRedirectUrl(),
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly',
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('No OAuth URL received from Supabase for calendar linking');
      }

      const cleanUrl = data.url.replace(/\s/g, '%20');
      
      // Open the auth window with the URL
      await authManager.openAuthWindow(cleanUrl);
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  // Meeting notification handler
  ipcMain.on('show-meeting-notification', (event, notificationData) => {
    notificationUtils.showMeetingNotification(notificationData);
  });

  // Handler for sending a test notification
  ipcMain.on('send-test-notification', () => {
    notificationUtils.sendTestNotification();
  });

  // Handler for checking notification permission status
  ipcMain.handle('check-notification-permission', async () => {
    try {
      // For Electron, we can check if notifications are supported and try to create one
      // The actual permission check happens when we try to show a notification
      if (Notification.isSupported()) {
        // Try to create a notification to test if we have permission
        // If this fails, we don't have permission
        try {
          const testNotification = new Notification({
            title: 'Test',
            body: 'Permission check',
            silent: true
          });
          testNotification.close();
          return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  });

  // Handler for granting notification permission
  ipcMain.handle('grant-notification-permission', async () => {
    try {
      // For Electron, we can't programmatically request notification permission
      // The permission is typically granted when the app is first installed
      // or when the user first tries to show a notification
      if (Notification.isSupported()) {
        // Try to show a notification - this will trigger the permission request on first use
        try {
          const permissionNotification = new Notification({
            title: 'Call Card',
            body: 'Requesting notification permission...',
            silent: true
          });
          permissionNotification.close();
          return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Error granting notification permission:', error);
      return false;
    }
  });

  // Handler for revoking notification permission
  ipcMain.handle('revoke-notification-permission', async () => {
    try {
      // Note: Electron doesn't provide a direct way to revoke permissions
      // This would typically require user to go to system settings
      return false; // Indicate that manual action is required
    } catch (error) {
      console.error('Error revoking notification permission:', error);
      return false;
    }
  });

  ipcMain.handle('setup-google-calendar', setupGoogleCalendar);

  // Clean up old handler if it exists (no longer needed)
  // ipcMain.removeHandler('fetch-google-calendar-events');
  
  // Topic labels storage for classification
  let currentTopicLabels = [];
  
  // Handler to receive topic labels from the renderer
  ipcMain.on('set-topic-labels', (event, topics) => {
    if (Array.isArray(topics)) {
      currentTopicLabels = topics;
    }
  });
  
  // Text classification handler for transcript analysis
  ipcMain.handle('classify-text', async (event, request) => {
    try {
      const requestId = request?.id || 'unknown';
      
      // Validate request format
      if (!request || typeof request !== 'object') {
        return { 
          error: 'Invalid request format',
          label: 'error',
          score: 0
        };
      }
      
      // Add the current topic labels to the request if available
      if (currentTopicLabels.length > 0) {
        request.topics = currentTopicLabels;
      }
      
      // Process the text through the classifier
      const result = await textClassifierUtils.classifyText(request);
      return result;
    } catch (error) {
      return {
        id: request?.id,
        label: 'error',
        score: 0,
        error: error.message || 'Unknown classification error'
      };
    }
  });

  // App lifecycle handlers
  ipcMain.on('quit-app', () => {
    app.quit();
  });

  // Focus main window handler
  ipcMain.handle('focus-main-window', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      return true;
    }
    return false;
  });

  // Handler for main process to request renderer sign-out
  ipcMain.on('initiate-renderer-sign-out', (event) => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('initiate-renderer-sign-out');
    }
  });

}

export { setupIpcHandlers };
