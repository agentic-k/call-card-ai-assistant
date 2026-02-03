// Main window manager file that coordinates all the individual window modules
import mainWindowModule from './windows/mainWindow.mjs';

// Re-export functions from individual modules
export default {
  // Main window functions
  createMainWindow: mainWindowModule.createMainWindow,
  minimizeMeetingWindow: mainWindowModule.activeMeetingWindow,
  activeMeetingWindow: mainWindowModule.activeMeetingWindow,
  resetWindowSize: mainWindowModule.resetWindowSize,
  restoreMainWindow: mainWindowModule.restoreMainWindow,
  getMainWindow: mainWindowModule.getMainWindow,
}