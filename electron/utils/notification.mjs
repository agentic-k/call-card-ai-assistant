import { Notification, app, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname in ESM (same pattern as mainWindow.mjs)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get notification icon path
const getNotificationIcon = () => {
  const iconName = 'notification-icon.png'; // Using a simple PNG for notifications
  let iconPath;

  if (app.isPackaged) {
    // In production, the icon will be in the 'assets' directory next to the executable.
    iconPath = path.join(process.resourcesPath, '..', 'public', 'icons', iconName);
  } else {
    // In development, use the same pattern as mainWindow.mjs - go up two levels from electron/utils
    iconPath = path.join(__dirname, '..', '..', 'public', 'icons', iconName);
  }

  // If the icon exists, create a nativeImage object from it
  if (fs.existsSync(iconPath)) {
    const image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      console.error('[Notification] Failed to create nativeImage from path. The image is empty.');
      return null;
    }
    return image;
  }
  
  return null;
};


// A utility function to show a native Electron notification.
// This can be expanded to handle different notification types.
function showNotification(title, body) {
  if (Notification.isSupported()) {
    const icon = getNotificationIcon();
    const notificationOptions = {
      title,
      body,
      silent: false, // Ensure sound plays
      urgency: 'normal', // Set urgency level
    };

    if (icon) {
      notificationOptions.icon = icon;
    }

    const notification = new Notification(notificationOptions);
    notification.show();
  } else {
    console.log('Notifications are not supported on this system.');
  }
}

// Specific function for sending a test notification.
function sendTestNotification() {
  showNotification(
    "Test Notification",
    "This is a test notification from Call Card."
  );
}

// You can add other notification functions here, like the existing showMeetingNotification.
// To keep things clean, let's assume showMeetingNotification would also use showNotification.
function showMeetingNotification(notificationData) {
    const { title, body } = notificationData || {};
    showNotification(title || 'Meeting Reminder', body || 'You have a meeting starting soon.');
}


export default {
  sendTestNotification,
  showMeetingNotification,
}; 