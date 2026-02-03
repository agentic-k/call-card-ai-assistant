import { ElectronAPI } from '@/types/electron';
import { createSystemAudioLoopbackStream } from '@/lib/audio/audio-utils';
import { toast } from 'sonner';

// Custom interface for WebSocket with attempt count tracking
interface DeepgramWebSocket extends WebSocket {
  _attemptCount?: number;
}

// Max reconnect attempts
export const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;
const CONNECTION_TIMEOUT_MS = 30000;

// Additional interfaces
interface ConnectionMetrics {
  connectionStartTime?: number;
  lastSuccessfulConnection?: number;
  consecutiveFailures: number;
  totalReconnects: number;
}

export interface TranscriptionServiceRefs {
  audioStreamRef: React.MutableRefObject<MediaStream | null>;
  webSocketRef: React.MutableRefObject<DeepgramWebSocket | null>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  processorNodeRef: React.MutableRefObject<AudioWorkletNode | null>;
  isConnectionActiveRef: React.MutableRefObject<boolean>;
  reconnectTimerRef: React.MutableRefObject<number | null>;
  connectionTimeoutRef: React.MutableRefObject<number | null>;
  attemptCountRef: React.MutableRefObject<number>;
  connectionMetricsRef: React.MutableRefObject<ConnectionMetrics>;
  lastHeartbeatRef: React.MutableRefObject<number>;
  heartbeatIntervalRef: React.MutableRefObject<number | null>;
  finalTranscriptPartsRef: React.MutableRefObject<string[]>;
}

/**
 * Starts audio recording and transcription.
 */
export const startMeetingTranscription = async (
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>,
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>,
  refs: TranscriptionServiceRefs,
  accessToken: string,
  onTranscriptReceived: (data: any) => void,
  onDataSent?: () => void,
  onReconnectionUpdate?: (isReconnecting: boolean, attemptCount: number) => void,
) => {
  await startTranscriptionWithStream(
    setTranscribedText,
    setIsRecording,
    refs,
    accessToken,
    onTranscriptReceived,
    async () =>
      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 },
      }),
    onDataSent,
    onReconnectionUpdate,
  );
};

// Alias for clarity
export const startMicTranscription = startMeetingTranscription;

// Start transcription using system loopback stream (macOS via electron-audio-loopback)
export const startSystemTranscription = async (
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>,
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>,
  refs: TranscriptionServiceRefs,
  accessToken: string,
  onTranscriptReceived: (data: any) => void,
  onDataSent?: () => void,
  onReconnectionUpdate?: (isReconnecting: boolean, attemptCount: number) => void,
) => {
  await startTranscriptionWithStream(
    setTranscribedText,
    setIsRecording,
    refs,
    accessToken,
    onTranscriptReceived,
    async () => {
      const stream = await createSystemAudioLoopbackStream();
      if (!stream) throw new Error('System audio loopback stream unavailable');
      return stream;
    },
    onDataSent,
    onReconnectionUpdate,
  );
};

// Pause/resume helpers using AudioContext suspend/resume
export const pauseTranscription = async (refs: TranscriptionServiceRefs): Promise<void> => {
  try {
    if (refs.audioContextRef.current && refs.audioContextRef.current.state === 'running') {
      await refs.audioContextRef.current.suspend();
    }
  } catch (e) {
    console.warn('pauseTranscription failed', e);
  }
};

export const resumeTranscription = async (refs: TranscriptionServiceRefs): Promise<void> => {
  try {
    if (refs.audioContextRef.current && refs.audioContextRef.current.state === 'suspended') {
      await refs.audioContextRef.current.resume();
    }
  } catch (e) {
    console.warn('resumeTranscription failed', e);
  }
};

// Shared core for mic/system flows
async function startTranscriptionWithStream(
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>,
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>,
  refs: TranscriptionServiceRefs,
  accessToken: string,
  onTranscriptReceived: (data: any) => void,
  getStream: () => Promise<MediaStream>,
  onDataSent?: () => void,
  onReconnectionUpdate?: (isReconnecting: boolean, attemptCount: number) => void,
) {
  try {
    refs.isConnectionActiveRef.current = true;
    refs.attemptCountRef.current = 0;
    refs.finalTranscriptPartsRef.current = [];
    refs.connectionMetricsRef.current = {
      connectionStartTime: Date.now(),
      consecutiveFailures: 0,
      totalReconnects: 0,
    };
    refs.lastHeartbeatRef.current = Date.now();
    setTranscribedText('');

    const audioStream = await getStream();
    refs.audioStreamRef.current = audioStream;

    await connectWebSocket(
      refs,
      refs.attemptCountRef.current,
      setTranscribedText,
      accessToken,
      onReconnectionUpdate,
      onTranscriptReceived,
    );

    if (refs.webSocketRef.current?.readyState === WebSocket.OPEN) {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const sourceNode = audioContext.createMediaStreamSource(audioStream);

      let audioProcessorPath = '/audio-processor.js';
      if ((window.electron as ElectronAPI)?.getAudioProcessorPath) {
        try {
          audioProcessorPath = await (window.electron as ElectronAPI).getAudioProcessorPath();
        } catch (error) {
          console.warn('Failed to get audio processor path from electron, using fallback:', error);
        }
      }

      try {
        await audioContext.audioWorklet.addModule(audioProcessorPath);
      } catch (workletError) {
        console.error('Failed to load audio processor from:', audioProcessorPath, workletError);
        const fallbackPaths = ['./audio-processor.js', '/audio-processor.js', 'audio-processor.js', '../audio-processor.js'];
        let loaded = false;
        for (const fp of fallbackPaths) {
          try {
            await audioContext.audioWorklet.addModule(fp);
            loaded = true;
            break;
          } catch (fallbackError) {
            console.warn('Failed fallback path:', fp, fallbackError);
          }
        }
        if (!loaded) throw new Error('Could not load audio processor from any path');
      }

      const processorNode = new AudioWorkletNode(audioContext, 'audio-processor', {
        processorOptions: { sampleRate: audioContext.sampleRate },
      });

      processorNode.onprocessorerror = (err) => {
        console.error('AudioWorklet error', err);
        toast.error('Audio processing error');
        stopMeetingTranscription(setIsRecording, refs);
      };

      if (typeof processorNode.port.postMessage === 'function') {
        try {
          processorNode.port.postMessage({ command: 'setPriority', priority: 'high' });
        } catch (error) {
          console.warn('Failed to set audio processor priority:', error);
        }
      }

      sourceNode.connect(processorNode);

      processorNode.port.onmessage = ({ data }) => {
        const ws = refs.webSocketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN || !refs.isConnectionActiveRef.current) return;
        const audioData = new Int16Array(data);
        if (audioData.length === 0) return;
        try {
          ws.send(data);
          refs.lastHeartbeatRef.current = Date.now();
          if (onDataSent) onDataSent();
        } catch (error) {
          console.error('[CLIENT] Error sending audio data:', error);
          attemptReconnect(refs, setTranscribedText, accessToken, onReconnectionUpdate, onTranscriptReceived);
        }
      };

      setupHeartbeatMonitoring(refs, setTranscribedText, accessToken, onReconnectionUpdate, onTranscriptReceived);

      refs.audioContextRef.current = audioContext;
      refs.processorNodeRef.current = processorNode;
      setIsRecording(true);
    } else {
      throw new Error('WebSocket not open after connect');
    }
  } catch (err: any) {
    console.error('startTranscriptionWithStream failed', err);
    toast.error(`Failed to start transcription: ${err.message || err}`);
    stopMeetingTranscription(setIsRecording, refs);
  }
}

/**
 * Sets up heartbeat monitoring to detect stale connections
 */
function setupHeartbeatMonitoring(
  refs: TranscriptionServiceRefs,
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>,
  accessToken: string,
  onReconnectionUpdate?: (isReconnecting: boolean, attemptCount: number) => void,
  onTranscriptReceived?: (data: any) => void,
) {
  // Clear any existing heartbeat interval
  if (refs.heartbeatIntervalRef.current) {
    clearInterval(refs.heartbeatIntervalRef.current);
  }

  refs.heartbeatIntervalRef.current = window.setInterval(() => {
    if (!refs.isConnectionActiveRef.current) return;

    const now = Date.now();
    const timeSinceLastHeartbeat = now - refs.lastHeartbeatRef.current;
    
    // console.log(`[CLIENT] Heartbeat check: ${timeSinceLastHeartbeat}ms since last activity (threshold: 60000ms)`);
    
    // Increased timeout to 60 seconds to work better with server pings (30s interval)
    // and account for potential Deepgram processing delays
    if (timeSinceLastHeartbeat > 60000) {
      // console.warn('[CLIENT] Heartbeat timeout detected, attempting reconnection...');
      refs.connectionMetricsRef.current.consecutiveFailures++;
      attemptReconnect(refs, setTranscribedText, accessToken, onReconnectionUpdate, onTranscriptReceived);
    }
  }, 15000); // Check every 15 seconds instead of 10
}

/**
 * Centralized reconnect trigger (uses exponential backoff + jitter)
 */
function attemptReconnect(
  refs: TranscriptionServiceRefs,
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>,
  accessToken: string,
  onReconnectionUpdate?: (isReconnecting: boolean, attemptCount: number) => void,
  onTranscriptReceived?: (data: any) => void,
) {
  if (!refs.isConnectionActiveRef.current) return;
  
  // Update metrics
  refs.connectionMetricsRef.current.consecutiveFailures++;
  refs.connectionMetricsRef.current.totalReconnects++;
  
  if (refs.attemptCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping reconnection attempts.`);
    console.error(`Connection metrics:`, refs.connectionMetricsRef.current);
    refs.isConnectionActiveRef.current = false;
    toast.error('Connection failed after multiple attempts. Please check your internet connection and try again.');
    return;
  }

  refs.attemptCountRef.current += 1; // Increment attempt counter
  
  // Notify that reconnection started
  if (onReconnectionUpdate) {
    onReconnectionUpdate(true, refs.attemptCountRef.current);
  }

  // Progressive backoff with Edge Function cold start consideration
  let backoff = Math.min(BASE_DELAY_MS * 2 ** (refs.attemptCountRef.current - 1), MAX_DELAY_MS);
  
  // Add extra delay for Edge Function cold starts after multiple failures
  if (refs.connectionMetricsRef.current.consecutiveFailures > 3) {
    backoff = Math.max(backoff, 15000); // At least 15 seconds for cold starts
  }
  
  const delay = backoff + (Math.random() * 2000); // Add jitter
  
  console.warn(`Reconnecting in ${Math.round(delay/1000)}s (attempt ${refs.attemptCountRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
  
  refs.reconnectTimerRef.current = window.setTimeout(() => {
    connectWebSocket(refs, refs.attemptCountRef.current, setTranscribedText, accessToken, onReconnectionUpdate, onTranscriptReceived).catch(() => {
      /* swallowed: further attempts by handler */
    });
  }, delay);
}

/**
 * Connects to Deepgram WebSocket with retry logic.
 */
const connectWebSocket = async (
  refs: TranscriptionServiceRefs,
  attemptCount: number,
  setTranscribedText: React.Dispatch<React.SetStateAction<string>>,
  accessToken: string,
  onReconnectionUpdate: ((isReconnecting: boolean, attemptCount: number) => void) | undefined,
  onTranscriptReceived: (data: any) => void,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Cleanup any existing socket & timers
    if (refs.webSocketRef.current) {
      refs.webSocketRef.current.close();
      refs.webSocketRef.current = null;
    }
    if (refs.reconnectTimerRef.current != null) {
      clearTimeout(refs.reconnectTimerRef.current);
      refs.reconnectTimerRef.current = null;
    }
    if (refs.connectionTimeoutRef.current != null) {
      clearTimeout(refs.connectionTimeoutRef.current);
      refs.connectionTimeoutRef.current = null;
    }

    // Get WebSocket URL from environment - this should point to your Fly.io service
    const wsBase = import.meta.env.VITE_WEBSOCKET_URL;
    
    // Validate WebSocket URL is configured
    if (!wsBase) {
      console.error('VITE_WEBSOCKET_URL not configured. Please set it to your Fly.io WebSocket URL (e.g., ws://127.0.0.1:3001)');
      console.error('Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
      return reject(new Error('VITE_WEBSOCKET_URL not configured. Please check your .env file.'));
    }
    
    // BUG: ws should only happen in local version
    // Ensure protocol is correct
    if (!wsBase.startsWith('ws://') && !wsBase.startsWith('wss://')) {
      console.error('WebSocket URL must start with ws:// or wss://, got:', wsBase);
      return reject(new Error('Invalid WebSocket protocol'));
    }
    
    console.log('Connecting to Fly.io WebSocket:', wsBase);

    const socket = new WebSocket(`${wsBase}`, [`jwt-${accessToken}`]) as DeepgramWebSocket;
    socket.binaryType = 'arraybuffer'; // Explicitly set binary type to ArrayBuffer
    // tag attempt count for backoff
    socket._attemptCount = attemptCount;

    // Connection timeout guard
    refs.connectionTimeoutRef.current = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.close(1001, 'Timeout');
      }
    }, CONNECTION_TIMEOUT_MS);

    socket.onopen = () => {
      console.log('WebSocket connection opened.');
      clearTimeout(refs.connectionTimeoutRef.current!);
      refs.webSocketRef.current = socket;
      
      // Reset failure metrics on successful connection
      refs.connectionMetricsRef.current.consecutiveFailures = 0;
      refs.connectionMetricsRef.current.lastSuccessfulConnection = Date.now();
      refs.lastHeartbeatRef.current = Date.now();
      
      // Log connection success with metrics
      // const connectionTime = Date.now() - (refs.connectionMetricsRef.current.connectionStartTime || 0);
      // console.debug(`WebSocket connected successfully in ${connectionTime}ms (attempt ${attemptCount + 1})`);
      
      // Notify that reconnection succeeded
      if (onReconnectionUpdate && refs.attemptCountRef.current > 0) {
        onReconnectionUpdate(false, 0);
        // toast.success('Transcription connection restored');
      }
      
      resolve();
    };

    socket.onmessage = (event) => {
      try {
        if (typeof event.data !== 'string') {
          console.warn('Received non-string WebSocket message:', event.data);
          return;
        }
        
        const parsedData = JSON.parse(event.data);
        
        // Always update heartbeat on any message from server
        refs.lastHeartbeatRef.current = Date.now();

        if (parsedData.type === 'pong') {
          // console.log('Received pong from server');
          return;
        }
        
        const transcript = parsedData?.channel?.alternatives?.[0]?.transcript;
        if (!transcript || transcript.trim().length === 0) {
          // console.debug('Received empty transcript, ignoring.');
          return;
        }

        // Only forward final results to reduce duplicates
        const isFinal = typeof parsedData?.is_final === 'boolean'
          ? parsedData.is_final
          : String(parsedData?.type || parsedData?.message_type || '').toLowerCase().includes('final');
        if (onTranscriptReceived && isFinal) onTranscriptReceived(parsedData);

      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    socket.onerror = (ev) => {
      console.error('WebSocket error', ev);
    };

    socket.onclose = (ev) => {
      console.log('WebSocket connection closed.', ev.code, ev.reason);
      clearTimeout(refs.connectionTimeoutRef.current!);
      console.warn(`WebSocket closed: ${ev.code} - ${ev.reason || 'no reason provided'}`);
      
      // Handle different close codes
      if (ev.code === 1006) {
        console.warn('WebSocket closed abnormally, likely due to network issues or Edge Function timeout');
      } else if (ev.code === 1008 || ev.code === 1014) {
        console.error('WebSocket closed due to authentication error. Token may be expired.');
        toast.error('Authentication error. Please refresh the page and try again.');
        refs.isConnectionActiveRef.current = false;
        return;
      } else if (ev.code === 1011) {
        console.error('WebSocket closed due to server error in Edge Function');
      }
      
      if (refs.isConnectionActiveRef.current && refs.attemptCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        // Add progressive delay for server errors
        if (ev.code === 1011 || ev.code === 1006) {
          // Edge Function might be cold starting or having issues
          setTimeout(() => {
            attemptReconnect(refs, setTranscribedText, accessToken, onReconnectionUpdate, onTranscriptReceived);
          }, 5000);
        } else {
          attemptReconnect(refs, setTranscribedText, accessToken, onReconnectionUpdate, onTranscriptReceived);
        }
      } else if (refs.attemptCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Connection permanently failed.`);
        refs.isConnectionActiveRef.current = false;
      } else if (refs.attemptCountRef.current === 0) {
        reject(new Error(`WebSocket closed: ${ev.reason || 'unknown'}`));
      }
    };
  });
};

/**
 * Stops audio recording and transcription.
 */
export const stopMeetingTranscription = (
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>,
  refs: TranscriptionServiceRefs,
  forceStop: boolean = false
) => {
  try {
    // console.debug('Stopping transcription...');
    refs.isConnectionActiveRef.current = false;
    
    // If force stop, immediately cancel any pending reconnection attempts
    if (forceStop && refs.reconnectTimerRef.current) {
      clearTimeout(refs.reconnectTimerRef.current);
      refs.reconnectTimerRef.current = null;
      refs.attemptCountRef.current = 0;
    }

    // Clear timers
    if (refs.reconnectTimerRef.current) {
      clearTimeout(refs.reconnectTimerRef.current);
      refs.reconnectTimerRef.current = null;
    }
    if (refs.connectionTimeoutRef.current) {
      clearTimeout(refs.connectionTimeoutRef.current);
      refs.connectionTimeoutRef.current = null;
    }
    if (refs.heartbeatIntervalRef.current) {
      clearInterval(refs.heartbeatIntervalRef.current);
      refs.heartbeatIntervalRef.current = null;
    }

    // Close WebSocket if open
    if (refs.webSocketRef.current) {
      if (refs.webSocketRef.current.readyState === WebSocket.OPEN) {
        // Send a close stream message to Deepgram before closing
        refs.webSocketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
        refs.webSocketRef.current.close(1000, 'Transcription ended by user');
      }
      refs.webSocketRef.current = null;
    }

    // Disconnect and stop audio processing node
    if (refs.processorNodeRef.current) {
      refs.processorNodeRef.current.disconnect();
      refs.processorNodeRef.current = null;
    }

    // Stop all tracks on the stream to release the mic
    if (refs.audioStreamRef.current) {
      refs.audioStreamRef.current.getTracks().forEach(track => {
        track.stop();
        // console.debug('Audio track stopped:', track.kind, track.label);
      });
      refs.audioStreamRef.current = null;
    }

    // Close and release the audio context
    if (refs.audioContextRef.current) {
      if (refs.audioContextRef.current.state !== 'closed') {
        refs.audioContextRef.current.close().catch(e => console.warn('Error closing audio context:', e));
      }
      refs.audioContextRef.current = null;
    }

    setIsRecording(false);
    // console.debug('Transcription stopped and resources released.');
  } catch (error) {
    console.error('Error stopping transcription:', error);
    // Even if there's an error, try to set recording state to false
    setIsRecording(false);
  }
};

/**
 * Map WebSocket numeric states to names (optional helper)
 */
export const getWebSocketStateName = (state: number): string => {
  switch (state) {
    case WebSocket.CONNECTING: return 'CONNECTING';
    case WebSocket.OPEN:       return 'OPEN';
    case WebSocket.CLOSING:    return 'CLOSING';
    case WebSocket.CLOSED:     return 'CLOSED';
    default:                   return `UNKNOWN(${state})`;
  }
};
