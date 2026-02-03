import { systemPreferences, dialog } from 'electron';
import { exec } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Create a log file for debugging
const logFile = path.join(app.getPath('userData'), 'permission-debug.log');
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  // console.debug(message); // Also log to console
};

// Define and export permission status constants
export const PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  NOT_DETERMINED: 'not-determined',
  RESTRICTED: 'restricted', // Often similar to denied, but OS-level restriction
};

// Get system preferences section for specific permission
function getSystemPreferencesSection(permissionType) {
  if (process.platform !== 'darwin') return '';
  
  switch(permissionType) {
    case 'microphone':
      return 'Privacy_Microphone';
    default:
      return '';
  }
}

// Open system preferences for specific permission
export function openSystemPreferences(permissionType) {
  if (process.platform !== 'darwin') return;
  
  const section = getSystemPreferencesSection(permissionType);
  if (!section) {
    console.warn(`No system preferences section defined for permission type: ${permissionType}`);
    return;
  }
  
  // Open macOS System Preferences
  exec(`open "x-apple.systempreferences:com.apple.preference.security?${section}"`);
}

// Check permission status directly from system
export function checkPermission(permissionType) {
  // Always check current system status first as the source of truth
  let currentStatus = PERMISSION_STATUS.NOT_DETERMINED;
  
  if (process.platform === 'darwin') {
    try {
      // Ensure the status returned by Electron matches one of our defined constants
      const systemStatus = systemPreferences.getMediaAccessStatus(permissionType);
      if (Object.values(PERMISSION_STATUS).includes(systemStatus)) {
        currentStatus = systemStatus;
      } else {
        console.warn(`Unknown media access status from system: ${systemStatus}`);
        // Fallback to not-determined if status is unrecognized
        currentStatus = PERMISSION_STATUS.NOT_DETERMINED;
      }
    } catch (error) {
      console.error(`Error checking system ${permissionType} access status:`, error);
      currentStatus = PERMISSION_STATUS.NOT_DETERMINED;
    }
  } else {
    // For non-macOS platforms, assume granted for simplicity in this context
    // Real apps might need more specific logic for other OSes
    currentStatus = PERMISSION_STATUS.GRANTED; 
  }
  
  return currentStatus;
}

// Request permission from the user
export async function requestPermission(permissionType, window) {
  logToFile(`[DEBUG] requestPermission called for ${permissionType}`);
  logToFile(`[DEBUG] Platform: ${process.platform}`);
  logToFile(`[DEBUG] Window provided: ${!!window}`);
  logToFile(`[DEBUG] App packaged: ${process.env.NODE_ENV === 'production' ? 'true' : 'false'}`);
  logToFile(`[DEBUG] process.env.NODE_ENV: ${process.env.NODE_ENV}`);

  if (process.platform === 'darwin') {
    try {
      // First check the current status
      const currentStatus = systemPreferences.getMediaAccessStatus(permissionType);
      logToFile(`[DEBUG] Current ${permissionType} status before request: ${currentStatus}`);
      
      // If already granted, return true
      if (currentStatus === 'granted') {
        logToFile(`[DEBUG] Permission already granted for ${permissionType}`);
        return true;
      }
      
      logToFile(`[DEBUG] Attempting to request ${permissionType} access via systemPreferences.askForMediaAccess`);
      logToFile(`[DEBUG] systemPreferences available: ${!!systemPreferences}`);
      logToFile(`[DEBUG] askForMediaAccess available: ${!!systemPreferences.askForMediaAccess}`);
      
      // Add check for the actual function
      if (!systemPreferences.askForMediaAccess) {
        logToFile(`[DEBUG] askForMediaAccess function is not available on systemPreferences`);
        return false;
      }
      
      const granted = await systemPreferences.askForMediaAccess(permissionType);
      logToFile(`[DEBUG] askForMediaAccess result: ${granted}`);
      
      // Check the status again after the request
      const newStatus = systemPreferences.getMediaAccessStatus(permissionType);
      logToFile(`[DEBUG] New ${permissionType} status after request: ${newStatus}`);
      
      return granted;
    } catch (error) {
      logToFile(`[DEBUG] Error in requestPermission: ${error}`);
      logToFile(`[DEBUG] Error name: ${error.name}`);
      logToFile(`[DEBUG] Error message: ${error.message}`);
      logToFile(`[DEBUG] Error stack: ${error.stack}`);
      
      // Additional electron-specific error checking
      if (error.message && error.message.includes('askForMediaAccess')) {
        logToFile(`[DEBUG] This appears to be an askForMediaAccess specific error`);
      }
      
      return false;
    }
  }
  
  logToFile(`[DEBUG] Not on macOS, returning true by default`);
  return true;
}

// Check and request permissions with user guidance if needed
export async function checkAndRequestPermissionWithDialog(permissionType, window) {
  if (process.platform !== 'darwin') return Promise.resolve(true);
  
  const status = checkPermission(permissionType);
  console.debug(`${permissionType} system permission status: ${status}`);
  
  if (status === PERMISSION_STATUS.GRANTED) {
    return true;
  }
  
  // Request permission (this might show the OS native dialog)
  const granted = await requestPermission(permissionType); // No window passed here to avoid double dialog
  console.debug(`${permissionType} permission granted after request: ${granted}`);
  
  if (!granted && window) { // Only show custom dialog if permission was NOT granted AND a window is provided
    // console.debug(`Permission for ${permissionType} not granted, showing guidance dialog.`);
    const { response } = await dialog.showMessageBox(window, {
      type: 'info',
      title: `${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} Permission Required`,
      message: `${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} access is required for Call-Card.`,
      detail: `Please enable ${permissionType} access for Call-Card in System Preferences > Security & Privacy > Privacy > ${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)}.`,
      buttons: ['Open System Preferences', 'OK'],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) { // 'Open System Preferences'
      openSystemPreferences(permissionType);
    }
    
    return granted; 
  }
  
  return granted;
}

// Check all required Mac permissions at startup
export function checkMacPermissions(mainWindow) {
  if (process.platform === 'darwin') {
    // console.debug("checkMacPermissions can be called, typically for 'microphone'. Relies on checkAndRequestPermissionWithDialog for dialogs.");
  }
}

// Revoke a specific permission and guide removal from system
export async function revokePermission(permissionType, window) {
  if (!window) {
    console.error(`Cannot show revoke dialog for ${permissionType} without a window object.`);
    try {
        console.debug(`${permissionType} permission revoked (no dialog shown, manual system change needed).`);
    } catch (error) {
        console.error(`Error revoking ${permissionType} permission:`, error);
    }
    return false;
  }

  try {
    console.debug(`${permissionType} permission revoked (manual system change needed)`);
    
    // For Mac OS, guide the user to system preferences to manually remove the permission
    if (process.platform === 'darwin') {
      const { response } = await dialog.showMessageBox(window, {
        type: 'info',
        title: `Revoke ${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} Permission`,
        message: `To fully revoke ${permissionType} access, you need to update system settings.`,
        detail: `Please disable ${permissionType} access for Call-Card in System Preferences > Security & Privacy > Privacy > ${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)}.`,
        buttons: ['Open System Preferences', 'OK'],
        defaultId: 0,
        cancelId: 1
      });

      if (response === 0) { // 'Open System Preferences'
        openSystemPreferences(permissionType);
      }
      return true;
    }
    
    return true;
  } catch (error) {
    console.error(`Error revoking ${permissionType} permission:`, error);
    return false;
  }
}

// Update the default export
export default {
  PERMISSION_STATUS,
  checkPermission,
  requestPermission,
  openSystemPreferences,
  checkAndRequestPermissionWithDialog,
  checkMacPermissions,
  revokePermission,
};
