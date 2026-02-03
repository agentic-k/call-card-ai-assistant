import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import {
  startMicTranscription,
  startSystemTranscription,
  stopMeetingTranscription,
  pauseTranscription,
  resumeTranscription,
  TranscriptionServiceRefs,
} from '@/services/deepgram-service';

/**
 * SystemAudioLoopbackTester
 *
 * UI test harness to run mic and system loopback transcriptions concurrently with a single control panel.
 * - Start: launches both mic and system transcription flows and shows separate transcript panes
 * - Pause/Resume: suspends/resumes audio processing (AudioContext) for both flows without dropping sockets
 * - Stop: fully closes both flows and clears active state
 *
 * Notes:
 * - We only append final transcripts (not partials) and perform cross-stream de-duplication to reduce echo bleed-through
 * - This is a tester component rendered on Settings page only
 */
const SystemAudioLoopbackTester: React.FC = () => {
  // Toast hook for error notifications
  const { toast } = useToast();
  
  // UI state for error messages and pause state
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Transcript strings for mic and system streams
  const [micTranscript, setMicTranscript] = useState('');
  const [sysTranscript, setSysTranscript] = useState('');

  // Active flags for each stream
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSysActive, setIsSysActive] = useState(false);
  
  // Connection status for each stream
  const [micConnectionStatus, setMicConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed'>('idle');
  const [sysConnectionStatus, setSysConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed'>('idle');

  // Independent refs bag for each transcription flow
  const micRefs = useRef<TranscriptionServiceRefs>({
    audioStreamRef: { current: null },
    webSocketRef: { current: null },
    audioContextRef: { current: null },
    processorNodeRef: { current: null },
    isConnectionActiveRef: { current: false },
    reconnectTimerRef: { current: null },
    connectionTimeoutRef: { current: null },
    attemptCountRef: { current: 0 },
    connectionMetricsRef: { current: { consecutiveFailures: 0, totalReconnects: 0 } as any },
    lastHeartbeatRef: { current: Date.now() },
    heartbeatIntervalRef: { current: null },
    finalTranscriptPartsRef: { current: [] },
  });

  const sysRefs = useRef<TranscriptionServiceRefs>({
    audioStreamRef: { current: null },
    webSocketRef: { current: null },
    audioContextRef: { current: null },
    processorNodeRef: { current: null },
    isConnectionActiveRef: { current: false },
    reconnectTimerRef: { current: null },
    connectionTimeoutRef: { current: null },
    attemptCountRef: { current: 0 },
    connectionMetricsRef: { current: { consecutiveFailures: 0, totalReconnects: 0 } as any },
    lastHeartbeatRef: { current: Date.now() },
    heartbeatIntervalRef: { current: null },
    finalTranscriptPartsRef: { current: [] },
  });

  // Track last appended lines (exact) and rolling windows for fuzzy de-dup across streams
  const lastMicLineRef = useRef<string>('');
  const lastSysLineRef = useRef<string>('');
  const lastMicLinesRef = useRef<string[]>([]);
  const lastSysLinesRef = useRef<string[]>([]);

  // Normalize utility for loose comparisons (lowercase, strip punctuation, squeeze spaces)
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Helper function to get connection status display
  const getConnectionStatusDisplay = (status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed') => {
    switch (status) {
      case 'idle':
        return { text: 'Idle', className: 'text-muted-foreground' };
      case 'connecting':
        return { text: 'Connecting...', className: 'text-yellow-600' };
      case 'connected':
        return { text: 'Connected', className: 'text-green-600' };
      case 'reconnecting':
        return { text: 'Reconnecting...', className: 'text-orange-600' };
      case 'failed':
        return { text: 'Connection Failed', className: 'text-red-600' };
      default:
        return { text: 'Unknown', className: 'text-muted-foreground' };
    }
  };

  // Fuzzy duplicate detector within a recent window
  const looksDuplicate = (candidate: string, recentList: string[]) => {
    const c = normalize(candidate);
    for (const line of recentList) {
      const n = normalize(line);
      if (!n) continue;
      if (c === n) return true;
      if (n.includes(c) || c.includes(n)) return true;
    }
    return false;
  };

  // Interpret “final” marker from server payloads
  const isFinalMessage = (data: any): boolean => {
    if (typeof data?.is_final === 'boolean') return data.is_final;
    const t = (data?.type || data?.message_type || '').toString().toLowerCase();
    return t.includes('final');
  };

  // Cleanup both flows on unmount
  useEffect(() => {
    return () => {
      if (isMicActive) stopMeetingTranscription(setIsMicActive, micRefs.current);
      if (isSysActive) stopMeetingTranscription(setIsSysActive, sysRefs.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start mic flow with de-dup on final results and error handling
  const startMic = async () => {
    setMicTranscript('');
    setMicConnectionStatus('connecting');
    try {
      await startMicTranscription(
        setMicTranscript,
        setIsMicActive,
        micRefs.current,
        (await import('@/integrations/supabase/client')).supabase
          ? (await (await import('@/integrations/supabase/client')).supabase.auth.getSession()).data.session?.access_token || ''
          : '',
        (data) => {
          try {
            const t = data?.channel?.alternatives?.[0]?.transcript as string | undefined;
            if (!t || !t.trim()) return;
            if (!isFinalMessage(data)) return;
            if (lastMicLineRef.current === t || lastSysLineRef.current === t) return;
            if (looksDuplicate(t, lastMicLinesRef.current) || looksDuplicate(t, lastSysLinesRef.current)) return;
            lastMicLineRef.current = t;
            lastMicLinesRef.current = [t, ...lastMicLinesRef.current].slice(0, 5);
            setMicTranscript((prev) => (prev ? prev + '\n' + t : t));
          } catch {}
        },
        undefined, // onDataSent
        (isReconnecting: boolean, attemptCount: number) => {
          // Handle reconnection status updates
          if (isReconnecting && attemptCount === 1) {
            // First reconnection attempt - show warning
            setMicConnectionStatus('reconnecting');
            sonnerToast.warning('Microphone connection lost. Attempting to reconnect...');
          } else if (isReconnecting && attemptCount >= 3) {
            // Multiple reconnection attempts - show error
            setMicConnectionStatus('failed');
            sonnerToast.error(`Microphone connection failed after ${attemptCount} attempts. Please check your connection.`);
          } else if (!isReconnecting && attemptCount > 0) {
            // Reconnection successful
            setMicConnectionStatus('connected');
            sonnerToast.success('Microphone connection restored');
          }
        }
      );
      // If we get here, connection was successful
      setMicConnectionStatus('connected');
    } catch (error: any) {
      console.error('Mic transcription failed:', error);
      setIsMicActive(false);
      setMicConnectionStatus('failed');
      
      // Show specific error messages based on error type
      let errorMessage = 'Failed to start microphone transcription';
      if (error?.name === 'NotAllowedError' || error?.message?.includes('permission')) {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
      } else if (error?.name === 'NotFoundError' || error?.message?.includes('device')) {
        errorMessage = 'No microphone device found. Please check your microphone connection.';
      } else if (error?.name === 'NotReadableError' || error?.message?.includes('busy')) {
        errorMessage = 'Microphone is busy or being used by another application.';
      } else if (error?.message?.includes('Connection refused') || error?.message?.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Cannot connect to transcription service. Please check your internet connection and try again.';
      } else if (error?.message) {
        errorMessage = `Microphone error: ${error.message}`;
      }
      
      toast({
        title: "Microphone Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Also show sonner toast for consistency
      sonnerToast.error(errorMessage);
    }
  };

  // Start system loopback flow with de-dup on final results and error handling
  const startSystem = async () => {
    setSysTranscript('');
    setSysConnectionStatus('connecting');
    try {
      await startSystemTranscription(
        setSysTranscript,
        setIsSysActive,
        sysRefs.current,
        (await import('@/integrations/supabase/client')).supabase
          ? (await (await import('@/integrations/supabase/client')).supabase.auth.getSession()).data.session?.access_token || ''
          : '',
        (data) => {
          try {
            const t = data?.channel?.alternatives?.[0]?.transcript as string | undefined;
            if (!t || !t.trim()) return;
            if (!isFinalMessage(data)) return;
            if (lastSysLineRef.current === t || lastMicLineRef.current === t) return;
            if (looksDuplicate(t, lastSysLinesRef.current) || looksDuplicate(t, lastMicLinesRef.current)) return;
            lastSysLineRef.current = t;
            lastSysLinesRef.current = [t, ...lastSysLinesRef.current].slice(0, 5);
            setSysTranscript((prev) => (prev ? prev + '\n' + t : t));
          } catch {}
        },
        undefined, // onDataSent
        (isReconnecting: boolean, attemptCount: number) => {
          // Handle reconnection status updates
          if (isReconnecting && attemptCount === 1) {
            // First reconnection attempt - show warning
            setSysConnectionStatus('reconnecting');
            sonnerToast.warning('System audio connection lost. Attempting to reconnect...');
          } else if (isReconnecting && attemptCount >= 3) {
            // Multiple reconnection attempts - show error
            setSysConnectionStatus('failed');
            sonnerToast.error(`System audio connection failed after ${attemptCount} attempts. Please check your connection.`);
          } else if (!isReconnecting && attemptCount > 0) {
            // Reconnection successful
            setSysConnectionStatus('connected');
            sonnerToast.success('System audio connection restored');
          }
        }
      );
      // If we get here, connection was successful
      setSysConnectionStatus('connected');
    } catch (error: any) {
      console.error('System audio transcription failed:', error);
      setIsSysActive(false);
      setSysConnectionStatus('failed');
      
      // Show specific error messages based on error type
      let errorMessage = 'Failed to start system audio transcription';
      if (error?.message?.includes('permission') || error?.message?.includes('Screen Recording')) {
        errorMessage = 'Screen Recording permission required. Please allow Screen Recording access in System Preferences > Security & Privacy > Privacy > Screen Recording.';
      } else if (error?.message?.includes('loopback')) {
        errorMessage = 'System audio loopback is not available. This feature requires macOS with proper permissions.';
      } else if (error?.message?.includes('Connection refused') || error?.message?.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Cannot connect to transcription service. Please check your internet connection and try again.';
      } else if (error?.message) {
        errorMessage = `System audio error: ${error.message}`;
      }
      
      toast({
        title: "System Audio Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Also show sonner toast for consistency
      sonnerToast.error(errorMessage);
    }
  };

  // Unified control panel actions
  const startBoth = async () => {
    setError(null);
    setMicTranscript('');
    setSysTranscript('');
    setMicConnectionStatus('idle');
    setSysConnectionStatus('idle');
    await Promise.all([startMic(), startSystem()]);
    setIsPaused(false);
  };

  const pauseBoth = async () => {
    await Promise.all([pauseTranscription(micRefs.current), pauseTranscription(sysRefs.current)]);
    setIsPaused(true);
  };

  const resumeBoth = async () => {
    await Promise.all([resumeTranscription(micRefs.current), resumeTranscription(sysRefs.current)]);
    setIsPaused(false);
  };

  const stopBoth = () => {
    stopMeetingTranscription(setIsMicActive, micRefs.current);
    stopMeetingTranscription(setIsSysActive, sysRefs.current);
    setMicConnectionStatus('idle');
    setSysConnectionStatus('idle');
    setIsPaused(false);
  };

  return (
    <div className="rounded-2xl p-6 border">
      <h2 className="text-xl font-semibold mb-2">System Audio (Loopback) Test</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Start a combined transcription session for your microphone and system audio. On first use, macOS may prompt for
        Screen Recording permission.
      </p>

      {/* Unified controls */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <Button onClick={startBoth} disabled={isMicActive || isSysActive}>
          Start Test (Mic + System)
        </Button>
        <Button variant="outline" onClick={isPaused ? resumeBoth : pauseBoth} disabled={!isMicActive && !isSysActive}>
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="secondary" onClick={stopBoth} disabled={!isMicActive && !isSysActive}>
          Stop
        </Button>
      </div>

      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <Separator className="mt-4" />

      {/* Transcripts side by side */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">Microphone Transcription</h3>
            <div className="flex items-center gap-2">
              {/* Connection status indicator */}
              <div className={`w-2 h-2 rounded-full ${
                micConnectionStatus === 'connected' ? 'bg-green-500' :
                micConnectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                micConnectionStatus === 'reconnecting' ? 'bg-orange-500 animate-pulse' :
                micConnectionStatus === 'failed' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <div className={`text-xs font-medium ${getConnectionStatusDisplay(micConnectionStatus).className}`}>
                {getConnectionStatusDisplay(micConnectionStatus).text}
              </div>
            </div>
          </div>
          <pre className="text-sm whitespace-pre-wrap bg-muted p-2 rounded min-h-28 max-h-48 overflow-auto">{micTranscript || '—'}</pre>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">System Audio Transcription</h3>
            <div className="flex items-center gap-2">
              {/* Connection status indicator */}
              <div className={`w-2 h-2 rounded-full ${
                sysConnectionStatus === 'connected' ? 'bg-green-500' :
                sysConnectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                sysConnectionStatus === 'reconnecting' ? 'bg-orange-500 animate-pulse' :
                sysConnectionStatus === 'failed' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <div className={`text-xs font-medium ${getConnectionStatusDisplay(sysConnectionStatus).className}`}>
                {getConnectionStatusDisplay(sysConnectionStatus).text}
              </div>
            </div>
          </div>
          <pre className="text-sm whitespace-pre-wrap bg-muted p-2 rounded min-h-28 max-h-48 overflow-auto">{sysTranscript || '—'}</pre>
        </div>
      </div>
    </div>
  );
};

export default SystemAudioLoopbackTester;


