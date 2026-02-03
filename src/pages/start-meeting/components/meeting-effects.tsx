import React, { useEffect, useRef, useState } from 'react';
import { MeetingTemplate } from '@/types/meeting';
import { toast } from 'sonner';
import { Template } from '@/services/templatesFunction';

interface MeetingEffectsProps {
  activeMeeting: any;
  activeTemplate: MeetingTemplate | null;
  currentSection: any;
  checklist: any[];
  completedItems: any[];
  isCurrentSectionComplete: () => boolean;
  isMeetingComplete: boolean;
  setIsMeetingComplete: (isComplete: boolean) => void;
  pauseMeeting: () => void;
  nextSection: (template: Template | null) => void;
  resetSectionTime: () => void;
  setIsMeetingActive: (isMeetingActive: boolean) => void;
  sectionTimer: number;
  isManualNavigation?: boolean;
  setIsManualNavigation?: (value: boolean) => void;
}

const MeetingEffects: React.FC<MeetingEffectsProps> = ({
  activeMeeting,
  activeTemplate,
  currentSection,
  checklist,
  completedItems,
  isCurrentSectionComplete,
  isMeetingComplete,
  setIsMeetingComplete,
  pauseMeeting,
  nextSection,
  resetSectionTime,
  setIsMeetingActive,
  sectionTimer,
  isManualNavigation = false,
  setIsManualNavigation
}) => {
  const [naturallyCompletedSections, setNaturallyCompletedSections] = useState<Set<string>>(new Set());
  const prevSectionIdRef = useRef<string | null>(null);

  // Handle sidebar and titlebar hiding when meeting starts
  useEffect(() => {
    if (activeMeeting) {
      setIsMeetingActive(true);
    } else {
      setIsMeetingActive(false);
    }
  }, [activeMeeting, setIsMeetingActive]);

  // Reset state when section changes AND clear manual navigation flag
  useEffect(() => {
    if (currentSection) {
      // Clear manual navigation flag after section change is processed
      if (setIsManualNavigation && isManualNavigation) {
        const timer = setTimeout(() => {
          setIsManualNavigation(false);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
    prevSectionIdRef.current = currentSection?.id || null;
  }, [currentSection?.id, isManualNavigation, setIsManualNavigation]);
  
  // Check if current section is complete and handle next section logic
  useEffect(() => {
    if (activeMeeting && activeTemplate && currentSection && isCurrentSectionComplete()) {
      const content = activeTemplate.content as any;
      if (!content || !content.sections) return;
      
      if (activeMeeting.currentSectionIndex < content.sections.length - 1) {
        // Only proceed if we're not already in the process of moving to the next section
        if (!isMeetingComplete && !isManualNavigation) {
          handleMoveToNextSection();
        }
      } else if (!isMeetingComplete) {
        setIsMeetingComplete(true);
        pauseMeeting();
        toast.success("Meeting completed!");
      }
    }
  }, [
    checklist, 
    completedItems, 
    activeMeeting, 
    activeTemplate, 
    currentSection, 
    isCurrentSectionComplete, 
    isMeetingComplete,
    sectionTimer,
    isManualNavigation,
    naturallyCompletedSections
  ]);

  const handleMoveToNextSection = () => {
    // Mark current section as naturally completed
    if (currentSection) {
      setNaturallyCompletedSections(prev => new Set([...prev, currentSection.id]));
    }
    
    resetSectionTime();
    nextSection(activeTemplate as unknown as Template);
    toast.success("Moving to next section!");
  };

  // Reset all states when meeting ends
  useEffect(() => {
    if (!activeMeeting) {
      setNaturallyCompletedSections(new Set());
      prevSectionIdRef.current = null;
    }
  }, [activeMeeting]);

  return null;
};

export default MeetingEffects; 