import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMeetingTimerProps {
  isRunning?: boolean;
  currentSection?: any;
  onSectionTimeExpired?: () => void;
  onTimerUpdate?: (time: number) => void;
  isMeetingComplete?: boolean;
}

export const useMeetingTimer = ({
  isRunning = false,
  currentSection,
  onSectionTimeExpired,
  onTimerUpdate,
  isMeetingComplete = false
}: UseMeetingTimerProps) => {
  const [timer, setTimer] = useState(0);
  const [sectionTimer, setSectionTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(isRunning);
  
  // Use refs for timing logic to avoid state update delays
  const startTimeRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number>(0);
  const sectionStartTimeRef = useRef(0);
  const currentSectionRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  
  const onTimerUpdateRef = useRef(onTimerUpdate);
  const onSectionTimeExpiredRef = useRef(onSectionTimeExpired);
  
  useEffect(() => {
    onTimerUpdateRef.current = onTimerUpdate;
    onSectionTimeExpiredRef.current = onSectionTimeExpired;
  }, [onTimerUpdate, onSectionTimeExpired]);
  
  // Update section reference when it changes
  useEffect(() => {
    if (currentSection && currentSectionRef.current?.title !== currentSection.title) {
      sectionStartTimeRef.current = timer;
      currentSectionRef.current = currentSection;
      setSectionTimer(0);
    }
  }, [currentSection, timer]);
  
  // Start/stop timer based on isRunning prop
  useEffect(() => {
    const shouldRun = isRunning && !isMeetingComplete;
    
    if (shouldRun !== isTimerRunning) {
      setIsTimerRunning(shouldRun);
      
      if (shouldRun) {
        // Starting timer
        if (pausedAtRef.current > 0) {
          // If resuming from pause, adjust the start time
          startTimeRef.current = Date.now() - (pausedAtRef.current * 1000);
        } else {
          // If starting fresh
          startTimeRef.current = Date.now();
        }
        lastUpdateRef.current = Date.now();
      } else {
        // Pausing timer
        pausedAtRef.current = timer;
        // Cancel any existing animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    }
  }, [isRunning, isMeetingComplete, isTimerRunning, timer]);
  
  // Timer effect using RAF for more accurate timing
  useEffect(() => {
    if (!isTimerRunning) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    // Initialize startTime if not set
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now() - (timer * 1000);
      lastUpdateRef.current = Date.now();
    }
    
    // Use requestAnimationFrame for smoother updates
    const updateTimer = () => {
      const now = Date.now();
      // Only update if at least 1 second has passed since last update
      if (now - lastUpdateRef.current >= 1000) {
        const elapsedSeconds = Math.floor((now - (startTimeRef.current as number)) / 1000);
        
        // Update only if time has actually changed
        if (elapsedSeconds !== timer) {
          setTimer(elapsedSeconds);
          
          // Update section timer
          const newSectionTime = elapsedSeconds - sectionStartTimeRef.current;
          setSectionTimer(newSectionTime);
          
          // Call onTimerUpdate if provided
          if (onTimerUpdateRef.current) {
            onTimerUpdateRef.current(elapsedSeconds);
          }
          
          // Check if section time expired
          if (currentSection?.durationMinutes) {
            if (newSectionTime >= currentSection.durationMinutes * 60 && onSectionTimeExpiredRef.current) {
              onSectionTimeExpiredRef.current();
            }
          }
          
          lastUpdateRef.current = now - ((now - lastUpdateRef.current) % 1000);
        }
      }
      
      if (isTimerRunning) {
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };
    
    // Start the animation frame loop
    animationFrameRef.current = requestAnimationFrame(updateTimer);
    
    return () => {
      // Clean up animation frame on unmount or when timer stops
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isTimerRunning, timer, currentSection]);
  
  // Reset timer to 0
  const resetTimer = useCallback(() => {
    setTimer(0);
    setSectionTimer(0);
    sectionStartTimeRef.current = 0;
    startTimeRef.current = null;
    pausedAtRef.current = 0;
    lastUpdateRef.current = Date.now();
    
    if (onTimerUpdateRef.current) {
      onTimerUpdateRef.current(0);
    }

    // Cancel any existing animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);
  
  // Reset section time
  const resetSectionTime = useCallback(() => {
    sectionStartTimeRef.current = timer;
    setSectionTimer(0);
  }, [timer]);
  
  // Toggle timer
  const toggleTimer = useCallback(() => {
    const newState = !isTimerRunning;
    setIsTimerRunning(newState);
    
    if (newState) {
      // Starting timer
      startTimeRef.current = Date.now() - (pausedAtRef.current * 1000);
      lastUpdateRef.current = Date.now();
    } else {
      // Pausing timer
      pausedAtRef.current = timer;
      // Cancel any existing animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isTimerRunning, timer]);
  
  // Format timer to MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  return {
    timer,
    sectionTimer,
    isTimerRunning,
    setIsTimerRunning,
    toggleTimer,
    resetTimer,
    resetSectionTime,
    formatTime
  };
};
