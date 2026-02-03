const { contextBridge, ipcRenderer } = require('electron');

/**
 * Helper function to create a listener for an IPC channel that returns an unsubscribe function.
 * This reduces boilerplate for setting up listeners in the preload script.
 * @param {string} channel The IPC channel to listen on.
 * @param {boolean} expectData Whether the callback expects data to be passed.
 * @returns {Function} A function that takes a callback and returns an unsubscribe function.
 */
const createIpcListener = (channel, expectData = true) => (callback) => {
  if (typeof callback !== 'function') {
    // Return a no-op unsubscribe function if callback is not a function
    return () => {};
  }
  
  const wrappedCallback = (event, data) => {
    // If the channel is not expected to pass data, just call the callback.
    // Otherwise, pass the received data.
    if (expectData) {
      callback(data);
    } else {
      callback();
    }
  };
  
  ipcRenderer.on(channel, wrappedCallback);
  
  // Return the unsubscribe function
  return () => {
    ipcRenderer.removeListener(channel, wrappedCallback);
  };
};

const electronApi = {
  // Expose methods for authentication window management
  openAuthWindow: (url) => ipcRenderer.send('open-auth-window', url),
  initiateGoogleOAuth: () => ipcRenderer.invoke('initiate-google-oauth'),
  initiateGoogleCalendarLinking: () => ipcRenderer.invoke('initiate-google-calendar-linking'),
  
  // Expose a way for the renderer to listen for auth callbacks from the main process
  handleAuthCallback: createIpcListener('auth-callback'),

  // Add handler for auth errors with proper cleanup
  handleAuthError: createIpcListener('auth-error'),

  // Add handler for auth callback URL (for PKCE flow)
  handleAuthCallbackUrl: createIpcListener('auth-callback-url'),

  // Expose a sign-out method for the main process
  signOut: () => ipcRenderer.invoke('sign-out'),
  
  // Expose Google Calendar setup
  setupGoogleCalendar: (args) => ipcRenderer.invoke('setup-google-calendar', args),

  // System audio loopback controls (electron-audio-loopback manual mode)
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),

  // Expose any other necessary IPC methods here
  // For example, existing permission-related IPCs
  checkPermission: (permissionType) => ipcRenderer.invoke('check-permission', permissionType),
  requestPermission: (permissionType) => ipcRenderer.invoke('request-permission', permissionType),
  openSystemPreferences: (permissionType) => ipcRenderer.invoke('open-system-preferences', permissionType),
  revokePermission: (permissionType) => ipcRenderer.invoke('revoke-permission', permissionType),
  setSkipPermissionPrompt: (permissionType, skip) => ipcRenderer.invoke('set-skip-permission-prompt', permissionType, skip),
  resetPermissions: () => ipcRenderer.invoke('reset-permissions'),
  
  // Expose window management
  toggleMainWindow: () => ipcRenderer.invoke('toggle-main-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  unmaximizeWindow: () => ipcRenderer.invoke('unmaximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  minimizeAndPositionWindow: () => ipcRenderer.send('minimize-and-position-window'),
  startMeeting: () => ipcRenderer.send('start-meeting'),
  endMeeting: () => ipcRenderer.send('end-meeting'),
  restoreMainWindow: () => ipcRenderer.send('restore-main-window'),
  resetWindowSize: () => ipcRenderer.send('reset-window-size'),
  
  // Expose app specific functions
  isElectron: true,

  handleAuthSuccess: (callback) => {
    ipcRenderer.on('auth-success', callback);
    return () => ipcRenderer.removeListener('auth-success', callback);
  },

  handleLoginBounce: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('login-bounce', handler);
    return () => ipcRenderer.removeListener('login-bounce', handler);
  },

  // Add a handler for the main process to request a renderer-side sign-out
  handleInitiateRendererSignOut: createIpcListener('initiate-renderer-sign-out', false),

  // Send test notification
  sendTestNotification: () => ipcRenderer.send('send-test-notification'),

  // Notification permissions
  checkNotificationPermission: () => ipcRenderer.invoke('check-notification-permission'),
  grantNotificationPermission: () => ipcRenderer.invoke('grant-notification-permission'),
  revokeNotificationPermission: () => ipcRenderer.invoke('revoke-notification-permission'),

  // Text classification
  classifyText: (request) => ipcRenderer.invoke('classify-text', request),
  setTopicLabels: (topics) => ipcRenderer.send('set-topic-labels', topics),

  // Audio and transcription
  getAudioSources: () => ipcRenderer.send('get-audio-sources'),
  onAudioSources: (callback) => {
    const wrappedCallback = (event, sources) => callback(sources);
    ipcRenderer.on('audio-sources', wrappedCallback);
    return () => ipcRenderer.removeListener('audio-sources', wrappedCallback);
  },
  startTranscription: () => ipcRenderer.send('start-transcription'),
  stopTranscription: () => ipcRenderer.send('stop-transcription'),
  onTranscriptUpdate: (callback) => {
    const wrappedCallback = (event, transcript) => callback(transcript);
    ipcRenderer.on('transcript-update', wrappedCallback);
    return () => ipcRenderer.removeListener('transcript-update', wrappedCallback);
  },

  // Generic invoke for other handlers
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // Focus main window
  focusMainWindow: () => ipcRenderer.invoke('focus-main-window'),
  
  // Auth token handling
  setExternalAuthToken: (accessToken, refreshToken) => ipcRenderer.send('set-external-auth-token', accessToken, refreshToken),
};

contextBridge.exposeInMainWorld('electron', electronApi);