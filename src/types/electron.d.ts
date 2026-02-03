export interface ElectronAPI {
  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  
  // App lifecycle
  quit: () => void;

  // Meeting controls
  startMeeting: () => void;
  endMeeting: () => void;
  restoreMainWindow: () => void;
  resetWindowSize: () => void;
  toggleTranscribeWindow?: () => void;
  transcribeWindowClose?: () => void;
  minimizeMeetingWindow?: () => void;
  minimizeAndPositionWindow?: () => void;

  // Permissions
  checkPermission: (permissionType: string) => Promise<string>;
  requestPermission: (permissionType: string) => Promise<boolean>;
  revokePermission?: (permissionType: string) => Promise<boolean>;
  openSystemPreferences: (section: string) => void;
  
  // Audio
  getAudioSources: () => void;
  onAudioSources: (callback: (sources: Array<{ id: string; name: string }>) => void) => void;
  getAudioProcessorPath?: () => Promise<string>;
  
  // Transcription
  startTranscription: () => void;
  stopTranscription: () => void;
  onTranscriptUpdate: (callback: (transcript: any) => void) => () => void;
  saveAudioFile?: (base64Data: string) => Promise<string>;
  openAudioFile?: (filePath: string) => void;

  // Window management
  minimizeWindow?: () => void;
  maximizeWindow?: () => void;
  closeWindow?: () => void;
  resizeWindow?: (width: number, height: number) => void;
  notifications?: {
    showMeetingNotification: (data: NotificationOptions) => void;
  };

  // System audio loopback controls
  enableLoopbackAudio: () => Promise<any>;
  disableLoopbackAudio: () => Promise<any>;

  // Permission storage methods
  getStoredPermission?: (permissionType: string) => Promise<string>;
  setStoredPermission?: (permissionType: string, status: string) => Promise<boolean>;
  shouldSkipPermissionPrompt?: (permissionType: string) => Promise<boolean>;
  setSkipPermissionPrompt?: (permissionType: string, skip: boolean) => Promise<boolean>;
  resetPermissions?: () => Promise<boolean>;

  // Text classification
  classifyText?: (request: any) => Promise<any>;
  setTopicLabels?: (topics: Array<{ label: string; description: string }>) => void;

  // Google Auth & Calendar
  openAuthWindow: (url: string) => void;
  initiateGoogleOAuth: () => Promise<{ success: boolean }>;
  initiateGoogleCalendarLinking: () => Promise<{ success: boolean }>;
  handleAuthCallback: (callback: (data: any) => void) => () => void;
  handleAuthError: (callback: (errorMessage: string) => void) => () => void;
  handleAuthSuccess: (callback: () => void) => () => void;
  handleLoginBounce: (callback: () => void) => () => void;

  // Add a handler for the main process to request a renderer-side sign-out
  handleInitiateRendererSignOut: (callback: () => void) => () => void;

  // Send test notification
  sendTestNotification: () => void;

  // Notification permissions
  checkNotificationPermission: () => Promise<boolean>;
  grantNotificationPermission: () => Promise<boolean>;
  revokeNotificationPermission: () => Promise<boolean>;

  // Generic invoke
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // Focus main window
  focusMainWindow: () => Promise<boolean>;
  
  // Auth token handling
  setExternalAuthToken: (accessToken: string, refreshToken: string) => void;
  
  // Additional methods referenced in AuthContext
  setupGoogleCalendar?: (options: any) => Promise<any>;
  signOut?: () => Promise<any>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
    handleExternalAuth?: (accessToken: string, refreshToken: string) => Promise<void>;
    debugClearSession?: () => Promise<void>;
  }
}

export {};