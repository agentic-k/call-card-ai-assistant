import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ActiveMeeting, MeetingSection } from '@/types/meetingTemplates';
import { Template } from '@/services/templatesFunction';

interface UseMeetingStateProps {
  initialMeeting?: ActiveMeeting | null;
}

export const useMeetingState = ({ initialMeeting = null }: UseMeetingStateProps = {}) => {
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeeting | null>(initialMeeting);
  const [isMeetingComplete, setIsMeetingComplete] = useState(false);
  const [isMeetingStarting, setIsMeetingStarting] = useState(false);
  const navigate = useNavigate();
  
  // Start a new meeting
  const startMeeting = (templateId: string) => {
    if (!templateId) {
      toast.error('Please select a template first');
      return;
    }
    
    // Set starting state immediately
    setIsMeetingStarting(true);
    
    // Set the meeting state
    setActiveMeeting({
      templateId: templateId,
      startTime: Date.now(),
      currentSectionIndex: 0,
      elapsedTime: 0,
      isRunning: true,
    });
    
    setIsMeetingComplete(false);
    
    // Immediately notify the main process to minimize and position the window
    if (window.electron) {
      (window.electron as any).minimizeAndPositionWindow();
    }
    
    // Clear the starting state after a short delay to allow skeleton to render
    setTimeout(() => {
      setIsMeetingStarting(false);
    }, 700); // 700ms to match the skeleton display time
  };
  
  // End the current meeting
  const stopMeeting = () => {
    // Immediately set the meeting to null to prevent restart issues
    setActiveMeeting(null);
    setIsMeetingComplete(false);
    setIsMeetingStarting(false);
    
    // Force stop any ongoing websocket connections
    if (window.electron && window.electron.stopTranscription) {
      try {
        window.electron.stopTranscription();
      } catch (err) {
        console.warn('Failed to force stop transcription:', err);
      }
    }
    
    // Restore window to normal size when meeting ends
    if (window.electron) {
      // First restore the window
      if (window.electron.restoreMainWindow) {
        window.electron.restoreMainWindow();
      }
      
      // Then reset window size with a slight delay to ensure proper restoration
      setTimeout(() => {
        if (window.electron.resetWindowSize) {
          window.electron.resetWindowSize();
        }
        
        // Navigate to g-calendar instead of start-meeting to avoid auto-start loop
        // This prevents the auto-start handler from triggering again
        navigate('/g-calendar');
        toast.success('Meeting ended successfully');
      }, 200); // Increased delay to ensure proper window restoration
    } else {
      // If no electron API, navigate to g-calendar to avoid auto-start loop
      navigate('/g-calendar');
      toast.success('Meeting ended successfully');
    }
  };
  
  // Pause the current meeting
  const pauseMeeting = () => {
    if (activeMeeting) {
      setActiveMeeting(prev => prev ? { ...prev, isRunning: false } : null);
    }
  };
  
  // Resume the current meeting
  const resumeMeeting = () => {
    if (activeMeeting) {
      setActiveMeeting(prev => prev ? { ...prev, isRunning: true } : null);
    }
  };
  
  // Move to the next section
  const nextSection = (currentTemplate: Template | null) => {
    if (activeMeeting && currentTemplate) {
      const content = currentTemplate.content as any;
      if (!content || !content.sections) return;
      
      const nextIndex = Math.min(
        activeMeeting.currentSectionIndex + 1,
        content.sections.length - 1
      );
      
      // Only update and show toast if we're actually moving to a new section
      if (nextIndex !== activeMeeting.currentSectionIndex) {
        setActiveMeeting(prev => prev ? {
          ...prev,
          currentSectionIndex: nextIndex,
        } : null);
        
        // toast.info("Moving to next section");
      }
    }
  };
  
  // Move to the previous section
  const previousSection = () => {
    if (activeMeeting) {
      const prevIndex = Math.max(activeMeeting.currentSectionIndex - 1, 0);
      
      setActiveMeeting(prev => prev ? {
        ...prev,
        currentSectionIndex: prevIndex,
      } : null);
    }
  };
  
  // Update meeting elapsed time
  const updateMeetingTime = (newTime: number) => {
    if (activeMeeting) {
      setActiveMeeting(prev => prev ? {
        ...prev,
        elapsedTime: newTime,
      } : null);
    }
  };
  
  // Get current section based on active meeting and template
  const getCurrentSection = (template: Template | null): MeetingSection | null => {
    if (!activeMeeting || !template || !template.content) return null;
    
    const content = template.content as any;
    if (!content || !content.sections) return null;
    
    return content.sections[activeMeeting.currentSectionIndex] || null;
  };
  
  // Complete the meeting
  const completeMeeting = () => {
    setIsMeetingComplete(true);
    pauseMeeting();
    toast.success("Meeting completed!");
  };
  
  return {
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
    getCurrentSection,
    completeMeeting
  };
}; 