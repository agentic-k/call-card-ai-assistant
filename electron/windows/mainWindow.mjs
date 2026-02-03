// mainwindow.mjs

import { BrowserWindow, screen, nativeImage } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';
import fs from 'fs';


// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

// THIS is the main window that will be used to display the main app
function createMainWindow() {
  let iconPath;

  if (isDev) {
    // Try multiple possible paths for the icon in development
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'public', 'icons', 'png', '1024x1024.png'),
      path.join(__dirname, '..', '..', 'public', 'icon.png')
    ];
    
    // Use the first path that exists
    iconPath = possiblePaths.find(p => {
      try { return fs.existsSync(p); } catch (e) { return false; }
    }) || possiblePaths[0];
  } else {
    // In production, use the platform-specific icon from the resources directory
    const iconName = process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
    iconPath = path.join(process.resourcesPath, 'icons', process.platform === 'darwin' ? 'mac' : '', iconName);
  }
  
  const icon = nativeImage.createFromPath(iconPath);

  if (!icon || icon.isEmpty()) {
    // Silent error handling for production
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    frame: true,
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#f5f5f5',
    icon: icon, // RESTORED TO CONSTRUCTOR
    level: 'status',
    setVisibleOnAllWorkspaces: false,      // This is needed for the window to be visible on all workspaces
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false, // Security: Disable remote module
      sandbox: true, // Security: Enable sandbox mode
      webSecurity: true, // Security: Enable web security
      allowRunningInsecureContent: false, // Security: Disable insecure content
      preload: path.join(__dirname, '..', 'preload.cjs'),
    },
  });

  // Remove the automatic URL loading - this will be handled by main.mjs
  // const startUrl = isDev
  //   ? 'http://127.0.0.1:8080'
  //   : `file://${path.join(__dirname, '..', '..', 'dist', 'index.html')}`;
  // 
  // mainWindow.loadURL(startUrl);


  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Only open dev tools in development if needed (this will be handled by main.mjs)
  // if (isDev) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }
  
  return mainWindow;
}

function activeMeetingWindow() {
  if (!mainWindow) {
    return null;
  }
  
  try {
    // Get the screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Set fixed dimensions for meeting mode
    const windowWidth = 390;
    const windowHeight = 350;
    
    // Position the window at 20% from the left edge of the screen
    const xPosition = Math.floor(screenWidth * 0.2);
    const yPosition = Math.max(0, (screenHeight - windowHeight) / 2);
    
    // Set minimum window size to maintain usability
    mainWindow.setMinimumSize(350, 300);
    // Set maximum window size to a reasonable larger size
    mainWindow.setMaximumSize(800, 800);
    
    // Set the initial window size and position
    mainWindow.setSize(windowWidth, windowHeight, true); // true = animate
    mainWindow.setPosition(xPosition, yPosition);
    
    // Additional settings for meeting mode
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(true); // Prevent resizing in meeting mode
    mainWindow.setMinimizable(true);
    mainWindow.setMaximizable(false); // Prevent maximizing in meeting mode
    
    // Make sure the window is visible and focused
    mainWindow.show();
    mainWindow.focus();
    
    return mainWindow;
  } catch (error) {
    return null;
  }
}

function resetWindowSize() {
  if (!mainWindow) return null;
  
  // Reset window constraints first
  mainWindow.setMaximumSize(0, 0); // Remove maximum size constraint (0,0 means no limit)
  mainWindow.setMinimumSize(400, 300); // Set reasonable minimum size
  
  // Enable window controls
  mainWindow.setResizable(true);
  mainWindow.setMaximizable(true);
  
  // Reset the window to its original size with animation
  mainWindow.setSize(1200, 800, true);
  
  // Center the window on the screen
  mainWindow.center();
  
  return mainWindow;
}

function restoreMainWindow() {
  if (!mainWindow) return;
  
  try {
    // Reset window constraints
    mainWindow.setMinimumSize(400, 300);
    mainWindow.setAspectRatio(0); // Remove aspect ratio constraint
    
    // Ensure window is not always on top before resizing
    mainWindow.setAlwaysOnTop(false);
    
    // Restore window controls
    mainWindow.setResizable(true);
    mainWindow.setMinimizable(true);
    mainWindow.setMaximizable(true);
    
    // Restore window to original size and settings
    mainWindow.setSize(1200, 800);
    mainWindow.center();
    
    // Ensure window is visible and focused
    mainWindow.show();
    mainWindow.focus();
    
    return mainWindow;
  } catch (error) {
    return mainWindow;
  }
}

function getMainWindow() {
  return mainWindow;
}

export default {
  createMainWindow,
  activeMeetingWindow,
  resetWindowSize,
  restoreMainWindow,
  getMainWindow
};
