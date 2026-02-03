import { useState, useEffect, useRef, useCallback } from 'react';
import { getFromStorage, setToStorage } from '@/utils/localStorage';

interface TranscriptionOptions {
  onTranscript?: (transcript: string) => void;
  autoStart?: boolean;
  savePath?: string;
}

export const TRANSCRIPTION_STORAGE_KEY = 'call-card-meeting-transcription';
export const TRANSCRIPTION_STATUS_KEY = 'call-card-transcribing';

export function useMeetingTranscription(options: TranscriptionOptions = {}) {
  const { onTranscript, autoStart = false, savePath } = options;
  
  const [isTranscribing, setIsTranscribing] = useState<boolean>(
    getFromStorage(TRANSCRIPTION_STATUS_KEY, false)
  );
  const [transcript, setTranscript] = useState<string>(
    getFromStorage(TRANSCRIPTION_STORAGE_KEY, '')
  );
  const [permissionStatus, setPermissionStatus] = useState<{
    mic: string;
    screen: string;
  }>({
    mic: 'not-determined',
    screen: 'not-determined',
  });

  const recognition = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef(transcript);
  
  // Keep transcript ref updated with latest value
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Auto-start transcription if requested
  useEffect(() => {
    if (autoStart) {
      startTranscription();
    }
    
    // Listen for storage changes from other windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TRANSCRIPTION_STATUS_KEY) {
        setIsTranscribing(e.newValue === 'true');
      }
      
      if (e.key === TRANSCRIPTION_STORAGE_KEY && e.newValue) {
        setTranscript(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [autoStart]);

  // Check microphone and screen recording permissions
  const checkPermissions = async () => {
    if (window.electron?.checkPermission) {
      try {
        const micStatus = await window.electron.checkPermission('microphone');
        const screenStatus = await window.electron.checkPermission('screen');
        
        setPermissionStatus({
          mic: micStatus,
          screen: screenStatus,
        });
        
        // console.debug('Permission status:', { mic: micStatus, screen: screenStatus });
      } catch (err) {
        console.error('Error checking permissions:', err);
      }
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    if (window.electron?.requestPermission) {
      try {
        const granted = await window.electron.requestPermission('microphone');
        if (granted) {
          setPermissionStatus(prev => ({ ...prev, mic: 'granted' }));
          return true;
        } else {
          console.error('Microphone permission denied');
          return false;
        }
      } catch (err) {
        console.error('Error requesting microphone permission:', err);
        return false;
      }
    } else {
      // Fallback for browser environment
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionStatus(prev => ({ ...prev, mic: 'granted' }));
        return true;
      } catch (err) {
        console.error('Error requesting microphone in browser:', err);
        return false;
      }
    }
  };

  // Request screen recording permission
  const requestScreenPermission = async () => {
    if (window.electron?.requestPermission) {
      try {
        if (window.electron.openSystemPreferences) {
          window.electron.openSystemPreferences('screen');
        }
        // We can't programmatically know if permission was granted
        return true;
      } catch (err) {
        console.error('Error requesting screen permission:', err);
        return false;
      }
    }
    return false;
  };

  // Initialize speech recognition
  const setupSpeechRecognition = () => {
    if (!recognition.current) {
      // Initialize the Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition.current = new SpeechRecognition();
        recognition.current.continuous = true;
        recognition.current.interimResults = true;
        recognition.current.lang = 'en-US';
        
        recognition.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            updateTranscript(finalTranscript);
          }
        };
        
        recognition.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'no-speech') {
            // This is a common error, just restart recognition
            restartRecognition();
          } else if (event.error === 'audio-capture') {
            // No microphone was found or not working
            stopTranscription();
          } else if (event.error === 'not-allowed') {
            // Permission to use microphone was denied
            stopTranscription();
          }
        };
        
        recognition.current.onend = () => {
          if (isTranscribing) {
            restartRecognition();
          }
        };
      }
    }
  };
  
  // Add timestamp to transcript
  const getTimestampedText = (text: string) => {
    const now = new Date();
    const timestamp = `[${now.toLocaleTimeString()}] `;
    return timestamp + text;
  };

  // Update transcript with new content
  const updateTranscript = useCallback((text: string) => {
    const timestampedText = getTimestampedText(text);
    const updatedTranscript = transcriptRef.current 
      ? transcriptRef.current + '\n' + timestampedText
      : timestampedText;
    
    setTranscript(updatedTranscript);
    setToStorage(TRANSCRIPTION_STORAGE_KEY, updatedTranscript);
    
    if (onTranscript) {
      onTranscript(updatedTranscript);
    }
  }, [onTranscript]);

  // Restart recognition when it stops
  const restartRecognition = () => {
    if (recognition.current && isTranscribing) {
      try {
        recognition.current.start();
      } catch (e) {
        console.error('Error restarting speech recognition:', e);
        // If we can't restart, stop transcription
        stopTranscription();
      }
    }
  };

  // Start transcription
  const startTranscription = async () => {
    if (permissionStatus.mic !== 'granted') {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        console.error('Microphone permission not granted');
        return false;
      }
    }
    
    setupSpeechRecognition();
    
    if (recognition.current) {
      try {
        recognition.current.start();
        setIsTranscribing(true);
        setToStorage(TRANSCRIPTION_STATUS_KEY, true);
        
        // Also start transcription in Electron if available
        if (window.electron?.startTranscription) {
          window.electron.startTranscription();
        }
        
        return true;
      } catch (e) {
        console.error('Error starting speech recognition:', e);
        return false;
      }
    }
    
    return false;
  };

  // Stop transcription
  const stopTranscription = () => {
    if (recognition.current) {
      try {
        recognition.current.stop();
      } catch (e) {
        console.error('Error stopping speech recognition:', e);
      }
    }
    
    setIsTranscribing(false);
    setToStorage(TRANSCRIPTION_STATUS_KEY, false);
    
    // Also stop transcription in Electron if available
    if (window.electron?.stopTranscription) {
      window.electron.stopTranscription();
    }
  };

  // Clear transcript
  const clearTranscript = () => {
    setTranscript('');
    setToStorage(TRANSCRIPTION_STORAGE_KEY, '');
  };

  // Save transcript
  const saveTranscript = (path?: string) => {
    const targetPath = path || savePath;
    if (targetPath) {
      // For now, we just use localStorage
      setToStorage(targetPath, transcript);
      return true;
    }
    return false;
  };

  // Auto-save transcript when component unmounts
  useEffect(() => {
    return () => {
      if (transcript) {
        saveTranscript();
      }
    };
  }, [transcript, savePath]);

  return {
    transcript,
    isTranscribing,
    permissionStatus,
    startTranscription,
    stopTranscription,
    updateTranscript,
    clearTranscript,
    saveTranscript,
    requestMicrophonePermission,
    requestScreenPermission,
  };
}
