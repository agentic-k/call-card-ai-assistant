import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  // Expose methods for authentication window management
  openAuthWindow: (url) => ipcRenderer.send('open-auth-window', url),
  
  handleAuthCallback: (callback) => {
    if (typeof callback === 'function') {
      const wrappedCallback = (event, data) => callback(data);
      ipcRenderer.on('auth-callback', wrappedCallback);
      return () => {
        ipcRenderer.removeListener('auth-callback', wrappedCallback);
      };
    }
    return () => {};
  },

  handleAuthError: (callback) => {
    if (typeof callback === 'function') {
      const wrappedCallback = (event, errorMessage) => callback(errorMessage);
      ipcRenderer.on('auth-error', wrappedCallback);
      return () => {
        ipcRenderer.removeListener('auth-error', wrappedCallback);
      };
    }
    return () => {};
  },

  handleLoginBounce: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('login-bounce', handler);
    return () => ipcRenderer.removeListener('login-bounce', handler);
  },

  handleAuthSuccess: (callback) => {
    ipcRenderer.on('auth-success', callback);
    return () => ipcRenderer.removeListener('auth-success', callback);
  },

  // Expose a sign-out method for the main process
  signOut: () => ipcRenderer.invoke('sign-out'),
  
  // Expose Google Calendar setup
  setupGoogleCalendar: (args) => ipcRenderer.invoke('setup-google-calendar', args),

  // System audio loopback controls
  enableLoopbackAudio: () => ipcRenderer.invoke('enable-loopback-audio'),
  disableLoopbackAudio: () => ipcRenderer.invoke('disable-loopback-audio'),

  // Permission-related IPCs
  checkPermission: (permissionType) => ipcRenderer.invoke('check-permission', permissionType),
  requestPermission: (permissionType) => ipcRenderer.invoke('request-permission', permissionType),
  openSystemPreferences: (permissionType) => ipcRenderer.invoke('open-system-preferences', permissionType),
  revokePermission: (permissionType) => ipcRenderer.invoke('revoke-permission', permissionType),
  setSkipPermissionPrompt: (permissionType, skip) => ipcRenderer.invoke('set-skip-permission-prompt', permissionType, skip),
  resetPermissions: () => ipcRenderer.invoke('reset-permissions'),
  
  // Window management
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
  
  // App specific functions
  isElectron: true,

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

  // Send test notification
  sendTestNotification: () => ipcRenderer.send('send-test-notification'),

  // Notification permissions
  checkNotificationPermission: () => ipcRenderer.invoke('check-notification-permission'),
  grantNotificationPermission: () => ipcRenderer.invoke('grant-notification-permission'),
  revokeNotificationPermission: () => ipcRenderer.invoke('revoke-notification-permission'),

  // Generic invoke for other handlers
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // Auth token handling
  setExternalAuthToken: (accessToken, refreshToken) => ipcRenderer.send('set-external-auth-token', accessToken, refreshToken),
};

console.log('[Preload] Exposing electron API to renderer with methods:', Object.keys(electronApi));
contextBridge.exposeInMainWorld('electron', electronApi);
console.log('[Preload] Electron API exposed successfully'); 