import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebar } from '@/components/Sidebar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { throttle } from 'lodash';

// Constants
const ANALYSIS_THROTTLE_MS = 5000; // 5 seconds throttle for transcript analysis

// Hooks
import { useTemplates } from '@/hooks/useTemplates';
import { useMeetingState } from '@/hooks/useMeetingState';
import { useMeetingTimer } from '@/hooks/useMeetingTimer';
import { useChecklistStore } from '@/store/checklistStore';
import { useQuestionCompletion } from './hooks/useQuestionCompletion';

// Components
// Meeting selector removed as meetings are now started from calendar page
import TemplateReadyCard from './components/template-ready-card';
import MeetingContent from './components/meeting/meeting-content';

// Page-specific components
import MeetingEffects from './components/meeting-effects';
import TranscriptDebugView, { addTranscriptEvent, clearTranscriptEvents } from './components/transcript-debug-view';
import { useAutoStartHandler } from './components/auto-start-handler';
import MeetingStartSkeleton from './components/meeting-start-skeleton';

// Text classification types
import { ClassifyTextResponse, ClassifyTextRequest } from '@/types/text-classifier';
import { v4 as uuidv4 } from 'uuid';

// Transcription service
import {
  startMicTranscription,
  startSystemTranscription,
  stopMeetingTranscription,
  pauseTranscription,
  resumeTranscription,
  TranscriptionServiceRefs,
} from '../../services/deepgram-service';

// Agent API functions

// Types
import { ChecklistItem } from '@/types/meetingTemplates';
import { FrameworkProgress } from './components/meeting/call-framework-progress-tab';


// Type declarations for Electron-specific window features
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Define the type for transcript entries
interface TranscriptEntry {
  timestamp: number; // Store as milliseconds since epoch
  text: string;
  isFinal: boolean;
  speaker?: string; // 'User' for mic, 'Speaker' for system loopback
}

const StartMeetingPage: React.FC = () => {
  const { isCollapsed, setIsCollapsed, setIsMeetingActive } = useSidebar();

  // For debugging audio capture
  const [isLocalRecording, setIsLocalRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Template management
  const {
    templates,
    activeTemplateId,
    isLoading,
    selectTemplate,
    getActiveTemplate,
    getMeetingTemplates,
    convertToMeetingTemplate
  } = useTemplates();

  // Meeting state management
  const {
    activeMeeting,
    isMeetingComplete,
    isMeetingStarting,
    setIsMeetingComplete,
    startMeeting,
    stopMeeting,
    pauseMeeting,
    resumeMeeting,
    nextSection,
    previousSection,
    updateMeetingTime,
    getCurrentSection
  } = useMeetingState();

  const activeTemplate = getActiveTemplate();
  const currentSection = getCurrentSection(activeTemplate);

  // Add state to track manual navigation
  const [isManualNavigation, setIsManualNavigation] = useState(false);

  // Checklist management using Zustand
  const {
    sections,
    currentSectionId,
    isCompletedOpen,
    setIsCompletedOpen,
    initializeSections,
    setCurrentSectionId,
    toggleItem,
    resetSectionChecklist,
    resetAllChecklists,
    markItemsComplete
  } = useChecklistStore();

  // Question completion and animation state
  const {
    completedQuestions,
    animatingQuestions,
    recentlyCompleted,
    completeQuestion,
    autoCompleteQuestions,
    resetQuestionCompletion
  } = useQuestionCompletion();

  // Auto-start handler
  const { hasAttemptedAutoStart, isAutoStarting } = useAutoStartHandler({
    templates,
    isLoading,
    activeMeeting,
    selectTemplate,
    initializeSections,
    startMeeting
  });

  // Minimize sidebar during auto-start for better UX and prevent body scrolling
  useEffect(() => {
    if (isAutoStarting || isMeetingStarting) {
      setIsCollapsed(true);
      setIsMeetingActive(true);
    }
  }, [isAutoStarting, isMeetingStarting, setIsCollapsed, setIsMeetingActive]);
  
  // Prevent body scrolling when meeting is active
  useEffect(() => {
    if (activeMeeting) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [activeMeeting]);

  // Get current section's checklist state
  const currentSectionState = currentSectionId ? sections[currentSectionId] : null;
  const checklist = currentSectionState?.checklist || [];

  // Get completed items from all sections for the new UI
  const completedItems = Object.values(sections).reduce((allCompleted, section) => {
    return [...allCompleted, ...section.completedItems];
  }, [] as ChecklistItem[]);

  // Update current section ID in store when the meeting state's currentSection changes
  useEffect(() => {
    setCurrentSectionId(currentSection ? currentSection.id : null);
  }, [currentSection, setCurrentSectionId]);

  // Check if current section is complete
  const isCurrentSectionComplete = () => {
    if (!currentSection || !currentSectionState) return false;
    return checklist.length === 0 && completedItems.length === currentSection.questions.length;
  };

  // Enhanced navigation functions that set manual navigation flag
  const handlePreviousSection = () => {
    setIsManualNavigation(true);
    previousSection();
  };

  const handleNextSection = () => {
    setIsManualNavigation(true);
    nextSection(activeTemplate);
  };

  // Timer management
  const {
    timer,
    sectionTimer,
    resetTimer,
    resetSectionTime
  } = useMeetingTimer({
    isRunning: activeMeeting?.isRunning || false,
    currentSection,
    onSectionTimeExpired: () => {
      if (activeMeeting && activeTemplate) {
        const content = activeTemplate.content as any;
        if (content?.sections && activeMeeting.currentSectionIndex < content.sections.length - 1) {
          nextSection(activeTemplate);
        }
      }
    },
    onTimerUpdate: updateMeetingTime
  });

  // Transcription state (dual streams)
  const [isMicRecording, setIsMicRecording] = useState(false);
  const [isSysRecording, setIsSysRecording] = useState(false);
  const isRecording = isMicRecording || isSysRecording;
  const [transcribedText, setTranscribedText] = useState<string>(''); // Raw text from service
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]); // Final and interim entries
  const [lastSavedTranscriptId, setLastSavedTranscriptId] = useState<string | null>(null);
  const prevTranscribedTextRef = useRef<string>(''); // Ref to track previous text
  const [accessToken, setAccessToken] = useState<string | null>(null); // State for Supabase token
  const fullTranscriptRef = useRef<string>(''); // Ref to track the full transcript
  const [isTranscribing, setIsTranscribing] = useState(false); // any stream sending
  const [isUserTranscribing, setIsUserTranscribing] = useState(false); // mic sending
  const [isSpeakerTranscribing, setIsSpeakerTranscribing] = useState(false); // system sending

  // Reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  
  // Calculate connection status based on current state
  const connectionStatus = useMemo(() => {
    if (isReconnecting) {
      return 'reconnecting';
    }
    if (isTranscribing && activeMeeting?.isRunning) {
      return 'active';
    }
    if (activeMeeting?.isRunning && !isTranscribing) {
      return 'pending';
    }
    if (!activeMeeting?.isRunning) {
      return 'failed';
    }
    return 'pending';
  }, [isReconnecting, isTranscribing, activeMeeting?.isRunning]);

  // Handle pause/resume functionality
  const handlePauseResume = useCallback(() => {
    if (!activeMeeting) return;
    
    if (activeMeeting.isRunning) {
      pauseMeeting();
    } else {
      resumeMeeting();
    }
  }, [activeMeeting, pauseMeeting, resumeMeeting]);

  // Determine if meeting is paused
  const isPaused = activeMeeting && !activeMeeting.isRunning;

  // Audio processing references (dual flows: mic + system)
  const micRefs = useRef<TranscriptionServiceRefs>({
    audioStreamRef: { current: null },
    webSocketRef: { current: null } as any,
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
    webSocketRef: { current: null } as any,
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

  // Expose debug functions to window for the Deepgram service
  useEffect(() => {
    (window as any).addTranscriptEvent = addTranscriptEvent;
    return () => {
      delete (window as any).addTranscriptEvent;
    };
  }, []);

  // Fetch Access Token when meeting becomes active
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAccessToken(session.access_token);
        } else {
          toast.error('Authentication session not found. Please log in.');
        }
      } catch (error) {
        console.error('Error fetching Supabase session:', error);
        toast.error('Failed to get authentication token.');
      }
    };

    if (activeMeeting?.isRunning && !accessToken) {
      fetchToken();
    }
    // Reset token if meeting stops
    if (!activeMeeting?.isRunning && accessToken) {
      setAccessToken(null);
    }

  }, [activeMeeting?.isRunning]); // Dependency on meeting running state

  // Convert Template to MeetingTemplate
  const activeMeetingTemplate = activeTemplate ? {
    id: activeTemplate.template_id,
    name: activeTemplate.template_name,
    description: activeTemplate.description || '',
    content: activeTemplate.content,
    isDefault: activeTemplate.is_default_template
  } : null;
  

  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Add new state for analysis status
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Add state to track discussed questions to avoid re-sending them
  const [discussedQuestionIds, setDiscussedQuestionIds] = useState<Set<string>>(new Set());

  // Add ref to track if an analysis is in progress
  const isAnalysisInProgressRef = useRef(false);
  
  // Add state for text classification
  const [currentClassification, setCurrentClassification] = useState<ClassifyTextResponse | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // Add state for framework progress
  const [frameworkProgress, setFrameworkProgress] = useState<FrameworkProgress | null>(null);

  // Initialize framework progress when active template changes
  useEffect(() => {
    if (activeTemplate?.sales_framework) {
      const framework = activeTemplate.sales_framework as any;
      const initialProgress = {
        name: framework.framework_name,
        progressPercentage: 0,
        completedQuestions: 0,
        totalQuestions: framework.framework_content?.length || 0,
        questions: framework.framework_content?.map((item: any, index: number) => ({
          id: `framework-${index}`,
          letter: String.fromCharCode(65 + index),
          color: ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500'][index] || 'bg-gray-500',
          category: item.title,
          question: item.question,
          status: 'unanswered' as const,
          confidence: 0,
          evidence: ''
        })) || []
      };
      setFrameworkProgress(initialProgress);
    }
  }, [activeTemplate?.sales_framework]);

  // Function to handle transcript analysis - now disabled as the endpoint has been removed
  const handleTranscriptAnalysis = useCallback(async (transcript: string) => {
    // This functionality has been removed as the check-answered-questions endpoint was deprecated
    // No need to show errors to users since this is an internal change
    // If we want to re-enable this in the future, we'll need to implement a new solution
    
    return;
  }, []);

  const throttledAnalysis = useMemo(
    () => throttle(handleTranscriptAnalysis, ANALYSIS_THROTTLE_MS, { leading: true, trailing: true }),
    [handleTranscriptAnalysis]
  );

  useEffect(() => {
    return () => {
      throttledAnalysis.cancel();
    };
  }, [throttledAnalysis]);

  // Function to classify text using the IPC API
  const classifyTranscriptText = useCallback(async (text: string, speaker?: string, isFinal: boolean = true) => {
    if (!text || !isFinal || !window.electron?.classifyText) return;
    
    try {
      setIsClassifying(true);
      const requestId = uuidv4();
      
      // Create request object
      const request: ClassifyTextRequest = {
        id: requestId,
        text,
        metadata: {
          source: speaker || 'transcript',
          timestamp: Date.now(),
          isFinal: true
        }
      };
      
      // Call the IPC method
      const response = await window.electron.classifyText(request).catch(error => {
        throw error;
      });
      
      if (response) {
        setCurrentClassification(response);
      }
    } catch (err) {
      console.error('Classification error:', err);
      setCurrentClassification(null);
    } finally {
      setIsClassifying(false);
    }
  }, []);

  const handleTranscriptReceived = useCallback((data: any) => {
    const transcript = data?.channel?.alternatives?.[0]?.transcript;
    if (!transcript) {
      return;
    }

    const isFinal = data.is_final === true;
    const speaker = (data as any).__speaker as string | undefined;

    // Handle transcript for UI
    setTranscriptEntries(prevEntries => {
      const newEntries = [...prevEntries];
      const lastEntry = newEntries.length > 0 ? newEntries[newEntries.length - 1] : null;

      if (isFinal) {
        // If last entry was interim, update it to final
        if (lastEntry && !lastEntry.isFinal) {
          lastEntry.text = transcript;
          lastEntry.isFinal = true;
          lastEntry.timestamp = Date.now();
          if (speaker) lastEntry.speaker = speaker;
        } else {
          // Otherwise, add a new final entry
          newEntries.push({
            text: transcript,
            isFinal: true,
            timestamp: Date.now(),
            speaker,
          });
        }
        // Update the full transcript with the final text
        fullTranscriptRef.current = fullTranscriptRef.current + ' ' + transcript;
        // Trigger analysis with the full transcript
        throttledAnalysis(fullTranscriptRef.current.trim());
        
        // Classify the final transcript chunk, not the entire buffer
        classifyTranscriptText(transcript.trim(), speaker, true);

      } else {
        // If last entry is interim, update it
        if (lastEntry && !lastEntry.isFinal) {
          lastEntry.text = transcript;
          if (speaker) lastEntry.speaker = speaker;
        } else {
          // Otherwise, add a new interim entry
          newEntries.push({
            text: transcript,
            isFinal: false,
            timestamp: Date.now(),
            speaker,
          });
        }
      }
      return newEntries;
    });
  }, [throttledAnalysis, classifyTranscriptText]);

  // Cross-stream de-duplication for dual inputs
  const lastMicLineRef = useRef<string>('');
  const lastSysLineRef = useRef<string>('');
  const lastMicLinesRef = useRef<string[]>([]);
  const lastSysLinesRef = useRef<string[]>([]);

  const normalizeForCompare = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const looksDuplicate = (candidate: string, recentList: string[]) => {
    const c = normalizeForCompare(candidate);
    for (const line of recentList) {
      const n = normalizeForCompare(line);
      if (!n) continue;
      if (c === n) return true;
      if (n.includes(c) || c.includes(n)) return true;
    }
    return false;
  };

  const makeDedupedReceiver = useCallback((stream: 'mic' | 'sys') => {
    return (data: any) => {
      try {
        const t = data?.channel?.alternatives?.[0]?.transcript as string | undefined;
        if (!t || !t.trim()) {
          return;
        }
        
        const isFinalMessage = typeof data?.is_final === 'boolean' ? data.is_final : true;
        if (!isFinalMessage) {
          return;
        }
        
        
        if (stream === 'mic') {
          if (lastMicLineRef.current === t || lastSysLineRef.current === t) {
            return;
          }
          if (looksDuplicate(t, lastMicLinesRef.current) || looksDuplicate(t, lastSysLinesRef.current)) {
            return;
          }
          lastMicLineRef.current = t;
          lastMicLinesRef.current = [t, ...lastMicLinesRef.current].slice(0, 5);
        } else {
          if (lastSysLineRef.current === t || lastMicLineRef.current === t) {
            return;
          }
          if (looksDuplicate(t, lastSysLinesRef.current) || looksDuplicate(t, lastMicLinesRef.current)) {
            return;
          }
          lastSysLineRef.current = t;
          lastSysLinesRef.current = [t, ...lastSysLinesRef.current].slice(0, 5);
        }
        
        // Tag speaker before forwarding
        const tagged = { ...data } as any;
        tagged.__speaker = stream === 'mic' ? 'User' : 'Speaker';
        handleTranscriptReceived(tagged);
      } catch (error) {
        console.error(`[Transcript:${stream}] Error processing transcript:`, error);
      }
    };
  }, [handleTranscriptReceived]);

  // Callback for handling reconnection status updates
  const handleReconnectionUpdate = (isReconnecting: boolean, attemptCount: number) => {
    setIsReconnecting(isReconnecting);
    setReconnectAttempt(attemptCount);
  };

  // Handle transcription based on meeting running state (dual flows, pause/resume without teardown)
  useEffect(() => {
    let removeTranscriptListener: (() => void) | undefined;

    const handleTranscriptionState = async () => {
      if (activeMeeting?.isRunning && accessToken) {
        try {
          // Set up transcript update listener
          if (window.electron?.onTranscriptUpdate) {
            removeTranscriptListener = window.electron.onTranscriptUpdate(handleTranscriptReceived);
          }

          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());

          if (transcriptEntries.length === 0) {
            setTranscribedText('');
            setTranscriptEntries([]);
            prevTranscribedTextRef.current = '';
          }

          const starts: Promise<any>[] = [];
          if (!micRefs.current.isConnectionActiveRef.current && !isMicRecording) {
            starts.push(startMicTranscription(
              setTranscribedText,
              setIsMicRecording,
              micRefs.current,
              accessToken,
              makeDedupedReceiver('mic'),
              () => { setIsTranscribing(true); setIsUserTranscribing(true); },
              handleReconnectionUpdate
            ));
          } else if (micRefs.current.audioContextRef.current?.state === 'suspended') {
            await resumeTranscription(micRefs.current);
            setIsTranscribing(true);
            setIsUserTranscribing(true);
          }
          if (!sysRefs.current.isConnectionActiveRef.current && !isSysRecording) {
            starts.push(startSystemTranscription(
              setTranscribedText,
              setIsSysRecording,
              sysRefs.current,
              accessToken,
              makeDedupedReceiver('sys'),
              () => { setIsTranscribing(true); setIsSpeakerTranscribing(true); },
              handleReconnectionUpdate
            ));
          } else if (sysRefs.current.audioContextRef.current?.state === 'suspended') {
            await resumeTranscription(sysRefs.current);
            setIsTranscribing(true);
            setIsSpeakerTranscribing(true);
          }
          if (starts.length) await Promise.all(starts);
        } catch (error) {
          console.error('Failed to start dual transcription:', error);
        }
      } else if (activeMeeting && !activeMeeting.isRunning) {
        await Promise.all([
          pauseTranscription(micRefs.current),
          pauseTranscription(sysRefs.current),
        ]);
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setIsTranscribing(false);
        setIsUserTranscribing(false);
        setIsSpeakerTranscribing(false);
      }
    };

    handleTranscriptionState();

    // Cleanup function
    return () => {
      if (removeTranscriptListener) {
        removeTranscriptListener();
      }
    };
  }, [activeMeeting?.isRunning, accessToken, isMicRecording, isSysRecording, activeMeeting, transcriptEntries.length, makeDedupedReceiver, handleTranscriptReceived]);

  // Add effect to handle cleanup when meeting is completely ended (not paused)
  useEffect(() => {
    // Only cleanup when meeting is actually ended (activeMeeting is null), not just paused
    if (!activeMeeting) {
      // Force stop any reconnection attempts first
      if (micRefs.current.reconnectTimerRef.current) {
        clearTimeout(micRefs.current.reconnectTimerRef.current);
        micRefs.current.reconnectTimerRef.current = null;
      }
      
      if (sysRefs.current.reconnectTimerRef.current) {
        clearTimeout(sysRefs.current.reconnectTimerRef.current);
        sysRefs.current.reconnectTimerRef.current = null;
      }
      
      // Set connection inactive flags
      micRefs.current.isConnectionActiveRef.current = false;
      sysRefs.current.isConnectionActiveRef.current = false;
      
      // Stop transcription if it is currently active
      stopMeetingTranscription(setIsMicRecording, micRefs.current);
      stopMeetingTranscription(setIsSysRecording, sysRefs.current);

      // Reset checklist state
      resetAllChecklists();

      // Reset timers
      resetTimer();

      // Clear transcript state
      setTranscribedText('');
      setTranscriptEntries([]);
      prevTranscribedTextRef.current = '';
      setLastSavedTranscriptId(null);
      fullTranscriptRef.current = ''; // Reset the full transcript

      // Clear debug transcript events
      clearTranscriptEvents();

      // Reset question completion
      resetQuestionCompletion();

      // Reset recording state
      setIsMicRecording(false);
      setIsSysRecording(false);

      // Reset reconnection state
      setIsReconnecting(false);
      setReconnectAttempt(0);
      setIsTranscribing(false);
      setIsUserTranscribing(false);
      setIsSpeakerTranscribing(false);
    }
  }, [activeMeeting, resetAllChecklists, resetTimer]);

  // Add cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup transcription when component unmounts
      stopMeetingTranscription(setIsMicRecording, micRefs.current);
      stopMeetingTranscription(setIsSysRecording, sysRefs.current);
    };
  }, []);

  // Function to toggle local audio recording for debugging
  const toggleLocalRecording = () => {
    if (isLocalRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsLocalRecording(false);
      toast.info("Stopped local recording. Saving audio file...");
    } else {
      const stream = micRefs.current.audioStreamRef.current;
      if (stream && stream.active) {
        recordedChunksRef.current = [];
        const options = { mimeType: 'audio/webm; codecs=opus' };
        try {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
        } catch (e) {
          console.warn("audio/webm with opus codec not supported, falling back to default.", e);
          mediaRecorderRef.current = new MediaRecorder(stream);
        }

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          document.body.appendChild(a);
          a.style.display = 'none';
          a.href = url;
          const extension = mimeType.includes('webm') ? 'webm' : 'wav';
          a.download = `debug-audio-${new Date().toISOString()}.${extension}`;
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          toast.success("Debug audio file saved to your downloads folder.");
        };

        mediaRecorderRef.current.start();
        setIsLocalRecording(true);
        toast.info("Started local recording for debugging.");
      } else {
        toast.error("Audio stream not available. Please start a meeting first, then try recording.");
      }
    }
  };

  // Comprehensive reset function
  const handleResetMeeting = () => {
    if (activeMeeting && activeTemplate) {
      stopMeeting(); // Stop current meeting first

      // Stop transcription if it is currently active
      if (isRecording) {
        stopMeetingTranscription(setIsMicRecording, micRefs.current);
        stopMeetingTranscription(setIsSysRecording, sysRefs.current);
      }

      requestAnimationFrame(() => {
        resetAllChecklists();
        resetTimer();

        // Reset transcript state for a fresh start
        setTranscribedText('');
        setTranscriptEntries([]);
        prevTranscribedTextRef.current = '';
        setLastSavedTranscriptId(null);
        fullTranscriptRef.current = ''; // Reset the full transcript

        // Clear debug transcript events
        clearTranscriptEvents();

        // Reset question completion
        resetQuestionCompletion();

        // Reset recording state
        setIsMicRecording(false);
        setIsSysRecording(false);
        setIsMeetingComplete(false); // Explicitly set complete to false

        // Reset reconnection state
        setIsReconnecting(false);
        setReconnectAttempt(0);

        // Start a fresh meeting instance after state reset
        startMeeting(activeTemplate.template_id);

        // Note: Transcription will automatically start when the new meeting begins
        toast.success('Meeting reset - starting fresh session');
      });
    }
  };



  // Show skeleton loading during auto-start
  if (isAutoStarting) {
    return <MeetingStartSkeleton isAutoStart={true} />;
  }

  // Show skeleton loading when meeting is starting normally
  if (isMeetingStarting && activeTemplate) {
    return <MeetingStartSkeleton templateName={activeTemplate.template_name} isAutoStart={false} />;
  }

  // Show loading skeleton if templates are still loading
  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto px-3 sm:px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-background ${activeMeeting ? 'overflow-hidden' : ''}`}>
      <div className={`w-full max-w-3xl mx-auto px-3 sm:px-4 flex-1 relative flex flex-col ${activeMeeting ? 'overflow-hidden' : ''}`}>
        <MeetingEffects
          activeMeeting={activeMeeting}
          activeTemplate={activeMeetingTemplate}
          currentSection={currentSection}
          checklist={checklist}
          completedItems={completedItems}
          isCurrentSectionComplete={isCurrentSectionComplete}
          isMeetingComplete={isMeetingComplete}
          setIsMeetingComplete={setIsMeetingComplete}
          pauseMeeting={pauseMeeting}
          nextSection={nextSection}
          resetSectionTime={resetSectionTime}
          setIsMeetingActive={setIsMeetingActive}
          sectionTimer={sectionTimer}
          isManualNavigation={isManualNavigation}
          setIsManualNavigation={setIsManualNavigation}
        />

        {/* Header removed as meetings are now started from calendar page */}

        {activeMeeting && activeTemplate ? (
            <div className="flex-1 relative h-[calc(100vh-80px)]">
              <MeetingContent
              activeTemplate={activeTemplate}
              currentSection={currentSection}
              sectionIndex={activeMeeting.currentSectionIndex}
              totalSections={(activeTemplate.content as any)?.sections?.length || 0}
              timer={timer}
              sectionTimer={sectionTimer}
              isTimerRunning={activeMeeting.isRunning}
              isMeetingComplete={isMeetingComplete}
              checklist={checklist}
              completedItems={completedItems}
              isCompletedOpen={isCompletedOpen}
              onEndMeeting={stopMeeting}
              onPreviousSection={handlePreviousSection}
              onNextSection={handleNextSection}
              completedQuestions={completedQuestions}
              transcriptEntries={transcriptEntries}
              activeMeeting={activeMeeting}
              reconnectAttempt={reconnectAttempt}
              maxReconnectAttempts={5}
              isTranscribing={isTranscribing}
              isUserTranscribing={isUserTranscribing}
              isSpeakerTranscribing={isSpeakerTranscribing}
              currentClassification={currentClassification}
              connectionStatus={connectionStatus}
              isClassifying={isClassifying}
              onPauseResume={handlePauseResume}
              isPaused={isPaused}
              frameworkProgress={frameworkProgress}
              onFrameworkQuestionUpdate={(questionId: string, status: 'completed' | 'in-progress' | 'pending') => {
                // Update framework progress state
                setFrameworkProgress((prev: FrameworkProgress | null) => {
                  if (!prev) return prev;
                  const updatedQuestions = prev.questions.map((q) => 
                    q.id === questionId ? { ...q, status } : q
                  );
                  return { ...prev, questions: updatedQuestions };
                });
              }}
            />

          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center h-full">
            <div className="text-center p-6 max-w-md">
              <h2 className="text-2xl font-semibold mb-4">No Active Meeting</h2>
              <p className="text-muted-foreground mb-6">
                Start a meeting from the Calendar page by clicking on an event with a linked template.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StartMeetingPage;