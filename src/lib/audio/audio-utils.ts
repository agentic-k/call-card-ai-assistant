/**
 * Utility functions for audio recording and processing
 */

type AudioPermissionStatus = 'granted' | 'denied' | 'prompt';


interface AudioRecordingOptions {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

// Global ElectronAPI is declared in src/types/electron.d.ts

/**
 * Check if the application needs to be restarted to apply permission changes
 * macOS often requires a restart after granting screen recording permission
 */
export const checkNeedsRestart = async (): Promise<boolean> => {
  try {
    const sources: any[] = await window.electron?.invoke('desktop-capturer-get-sources', {
      types: ['audio'],
      fetchWindowIcons: true,
    });
    if (!Array.isArray(sources)) return true;
    const hasSystem = sources.some((s) => {
      const id = String(s?.id || '').toLowerCase();
      const name = String(s?.name || '').toLowerCase();
      return id.includes('system') || name.includes('system');
    });
    return !hasSystem;
  } catch (error) {
    return true;
  }
};

/**
 * Request permission to access the device's microphone
 */
export const requestMicrophonePermission = async (): Promise<AudioPermissionStatus> => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return 'granted';
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return 'denied';
  }
};

/**
 * Revoke access to the device's microphone and update system/local storage settings
 */
export const revokeMicrophonePermission = async (): Promise<void> => {
  try {
    // For browser environments, simply stop all current audio tracks
    if (navigator.mediaDevices) {
      try {
        const streams = await navigator.mediaDevices.getUserMedia({ audio: true });
        streams.getTracks().forEach(track => {
          track.stop();
        });
        // // console.debug('Microphone permission revoked via browser API');
      } catch (error) {
        console.error('Error stopping microphone tracks:', error);
      }
    }
    
    // For Electron environments, use the IPC method to revoke permission
    if (window.electron?.revokePermission) {
      try {
        const success = await window.electron.revokePermission('microphone');
        // // console.debug('Microphone permission revoke call result:', success);

        // If running on macOS, guide user to system preferences if needed
        if (window.electron.openSystemPreferences) {
          window.electron.openSystemPreferences('Privacy_Microphone');
        }
      } catch (err) {
        console.error('Error revoking permission via Electron:', err);
      }
    }
  } catch (error) {
    console.error('Error revoking microphone permission:', error);
  }
};

/**
 * Creates an audio recorder that captures from microphone only
 */
export class MicrophoneAudioRecorder {
  private microphoneStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private isPaused = false;
  
  /**
   * Start recording audio from microphone only
   */
  async startRecording(): Promise<boolean> {
    try {
      // Get microphone stream
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create and configure the MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.microphoneStream);
      this.audioChunks = [];
      
      // Set up the dataavailable event to collect audio chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data in 1-second chunks
      this.isRecording = true;
      this.isPaused = false;
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.cleanupStreams();
      return false;
    }
  }
  
  /**
   * Pause the recording
   */
  pauseRecording(): boolean {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
      this.isPaused = true;
      return true;
    }
    return false;
  }
  
  /**
   * Resume the recording after pausing
   */
  resumeRecording(): boolean {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
      return true;
    }
    return false;
  }
  
  /**
   * Stop recording and return the audio data as a Blob
   */
  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        this.cleanupStreams();
        resolve(null);
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanupStreams();
        resolve(audioBlob);
      };
      
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.isPaused = false;
    });
  }
  
  /**
   * Check if currently recording
   */
  getRecordingStatus(): { isRecording: boolean; isPaused: boolean } {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
    };
  }
  
  /**
   * Get audio level data
   * In a real implementation, you would analyze the audio streams to get level data
   */
  getAudioLevel(): number {
    // This is a placeholder. In a real implementation, you would use 
    // AudioContext and AnalyserNode to get actual levels
    return this.isRecording && !this.isPaused ? Math.random() * 0.8 + 0.1 : 0;
  }
  
  /**
   * Clean up media streams
   */
  private cleanupStreams(): void {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }
    
    this.mediaRecorder = null;
    this.isRecording = false;
    this.isPaused = false;
  }
}

/**
 * Creates an audio stream from the microphone only
 */
export const createMicrophoneStream = async (
  options: AudioRecordingOptions = {}
): Promise<MediaStream | null> => {
  try {
    // Default audio constraints
    const constraints = {
      sampleRate: options.sampleRate || 44100,
      channelCount: options.channelCount || 1,
      echoCancellation: options.echoCancellation !== false,
      noiseSuppression: options.noiseSuppression !== false,
      autoGainControl: options.autoGainControl !== false,
    };
    
    // Get microphone stream
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: constraints,
    });
    
    return micStream;
  } catch (error) {
    console.error('Error creating microphone stream:', error);
    return null;
  }
}

/**
 * Simple speech transcription service
 * This is a placeholder implementation - in a real app, you would use a proper 
 * speech-to-text service like Google Speech-to-Text, Amazon Transcribe, etc.
 */
export class SpeechTranscription {
  private static readonly FAKE_TRANSCRIPTIONS = [
    "Speaker 1: Hello, can you hear me clearly?",
    "Speaker 1: Great! Let's discuss the project requirements.",
    "Speaker 1: What do you think about the timeline?",
    "Speaker 1: That sounds reasonable. Let's adjust the schedule.",
  ];
  
  private transcriptionIndex = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private currentTranscription = "";
  
  /**
   * Start transcription process on the provided audio stream
   * This is a simulation - in a real app, you would send the audio to a speech-to-text service
   */
  startTranscription(audioStream: MediaStream): void {
    this.transcriptionIndex = 0;
    this.currentTranscription = "";
    
    // Simulate incremental transcription results
    this.intervalId = setInterval(() => {
      if (this.transcriptionIndex < SpeechTranscription.FAKE_TRANSCRIPTIONS.length) {
        this.currentTranscription += SpeechTranscription.FAKE_TRANSCRIPTIONS[this.transcriptionIndex] + "\n\n";
        this.transcriptionIndex++;
      } else {
        // Loop through transcriptions
        this.transcriptionIndex = 0;
      }
    }, 3000); // Add new transcription every 3 seconds
  }
  
  /**
   * Stop the transcription process
   */
  stopTranscription(): string {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this.currentTranscription;
  }
  
  /**
   * Get the current transcription text
   */
  getCurrentTranscription(): string {
    return this.currentTranscription;
  }
}

/**
 * Returns a MediaStream containing only system audio loopback (macOS 12.3+) using electron-audio-loopback.
 * Flow: enable loopback via IPC → getDisplayMedia({ audio: true }) → disable loopback.
 */
export const createSystemAudioLoopbackStream = async (): Promise<MediaStream | null> => {
  try {
    if (!window.electron?.enableLoopbackAudio || !window.electron?.disableLoopbackAudio) {
      console.warn('electron-audio-loopback bridge not available');
      return null;
    }

    await window.electron.enableLoopbackAudio();

    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: false,
    });

    await window.electron.disableLoopbackAudio();
    return stream;
  } catch (error) {
    console.error('Failed to create system audio loopback stream:', error);
    try { await window.electron?.disableLoopbackAudio?.(); } catch {}
    return null;
  }
};
