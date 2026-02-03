import { Tray, Menu, screen } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import fs from 'fs';
import { fileURLToPath } from 'url';


// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let tray = null;

function createTray(app, windowManager) {
  try {
    // Use a smaller icon for the tray (24x24 is ideal for macOS)
    const iconPath = path.join(__dirname, '..', 'public', 'icons', 'png', '24x24.png');
    
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
    } else {
      // Fallback to monochrome icon if the regular icon is not found
      const fallbackIconPath = path.join(__dirname, '..', 'public', 'icon-monochrome-24x-24.png');
      if (fs.existsSync(fallbackIconPath)) {
        tray = new Tray(fallbackIconPath);
      } else {
        console.error('Error: No tray icon found');
      }
    }

    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Start Call-Card', 
        click: () => {
          windowManager.toggleFloatingWindow();
        } 
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          app.quit();
        } 
      }
    ]);
    
    tray.setToolTip('Call-Card');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      const startUrl = isDev
      ? 'http://127.0.0.1:8080/start-meeting?sidebar=minimized'
      : `file://${path.join(__dirname, '..', '..', 'dist', 'index.html/start-meeting?sidebar=minimized')}`;   

      const desiredUrl = startUrl; 

      // Get tray bounds first to determine the correct display
      const trayBounds = tray.getBounds();
      const displayContainingTray = screen.getDisplayMatching(trayBounds);
      const { width: currentScreenWidth, height: currentScreenHeight, x: currentScreenX, y: currentScreenY } = displayContainingTray.workArea;

      // Compute window size dynamically: full height of current display, 25% width of current display
      const desiredWidth = Math.round(currentScreenWidth * 0.35);
      const desiredHeight = currentScreenHeight;

      let mainWindow = windowManager.getMainWindow();
      
      if (!mainWindow) {
        windowManager.createMainWindow();
        mainWindow = windowManager.getMainWindow();
      }

      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();

        // Calculate xPos for extreme right of the current display
        const xPos = currentScreenX + currentScreenWidth - desiredWidth;
        // Position window at the top of the current display
        const yPos = currentScreenY;
        
        mainWindow.setPosition(xPos, yPos, false);

        // Resize the window
        mainWindow.setSize(desiredWidth, desiredHeight, true);

        // Load the specific URL/page
        mainWindow.loadURL(desiredUrl)
          .catch(err => console.error('Failed to load URL:', desiredUrl, err));

      } else {
        console.error('Error: Main window could not be obtained or created for tray click action.');
      }
    });
    
    return tray;
  } catch (error) {
    console.error('Error creating tray:', error);
    return null;
  }
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export default {
  createTray,
  destroyTray
};
