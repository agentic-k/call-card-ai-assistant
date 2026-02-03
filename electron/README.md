# Electron Preload Script Documentation

## Overview
The `preload.cjs` script is a critical component of our Electron application that safely bridges the gap between the main Electron process and the renderer process (web content). It uses Electron's `contextBridge` to expose specific Electron functionality to the web application in a secure manner.

## Key Features

### Window Controls
- `minimize()`: Minimizes the main window
- `maximize()`: Maximizes the main window
- `close()`: Closes the main window

### Meeting Window Controls
- `toggleTranscribeWindow()`: Toggles the transcription window
- `transcribeWindowClose()`: Closes the transcription window
- `activeMeetingWindow()`: Minimizes the meeting window
- `restoreMainWindow()`: Restores the main window

### Audio Handling
- `getAudioSources()`: Retrieves available audio sources
- `onAudioSources(callback)`: Listens for audio source updates

### App Controls
- `quit()`: Quits the application

### Permissions
- `checkPermission(permissionType)`: Checks for specific permissions
- `requestPermission(permissionType)`: Requests specific permissions
- `openSystemPreferences(section)`: Opens system preferences for a specific section

### Meeting Controls
- `startMeeting()`: Initiates a meeting
- `endMeeting()`: Ends the current meeting

### Transcription
- `startTranscription()`: Starts the transcription service
- `stopTranscription()`: Stops the transcription service
- `onTranscriptUpdate(callback)`: Listens for transcript updates

### Audio File Handling
- `saveAudioFile(base64Data)`: Saves audio data to a file
- `openAudioFile(filePath)`: Opens an audio file

### Notifications
- `checkNotificationPermission()`: Checks notification permissions
- `notifications.showMeetingNotification(data)`: Shows a meeting notification

## Security Considerations
- Uses `contextBridge` to safely expose only necessary functionality
- Implements proper permission handling for system access
- Provides controlled access to system features

## Usage
This preload script is automatically loaded by Electron when creating the application window. The exposed functions can be accessed in the renderer process through the `window.electron` object.

Example usage in renderer:
```typescript
// Minimize window
window.electron.minimize();

// Start a meeting
window.electron.startMeeting();

// Listen for transcript updates
window.electron.onTranscriptUpdate((transcript) => {
  // console.debug('New transcript:', transcript);
});
``` 