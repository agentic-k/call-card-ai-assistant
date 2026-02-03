import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Template } from '@/services/templatesFunction';
import { useParams } from 'react-router-dom';

/**
 * Auto-Start Meeting Handler
 * 
 * This hook handles automatic meeting startup when a templateId is passed in the URL.
 * 
 * Usage:
 * - Navigate to `/start-meeting/:templateId` to auto-start a meeting
 * - The template must exist and be accessible to the current user
 * - Only works when no meeting is currently active
 * 
 * Features:
 * - Validates template existence and user permissions
 * - Handles errors gracefully with user-friendly messages
 * - Prevents multiple auto-start attempts
 * - Resets state on URL changes for proper navigation handling
 * - Provides loading state for skeleton UI
 * 
 * Security:
 * - Only starts meetings with templates the user has access to
 * - Validates template content structure before starting
 * - Prevents auto-start if a meeting is already active
 */

interface AutoStartHandlerProps {
  templates: Template[];
  isLoading: boolean;
  activeMeeting: any;
  selectTemplate: (templateId: string) => Promise<void>;
  initializeSections: (content: any) => void;
  startMeeting: (templateId: string) => void;
}

export const useAutoStartHandler = ({
  templates,
  isLoading,
  activeMeeting,
  selectTemplate,
  initializeSections,
  startMeeting
}: AutoStartHandlerProps) => {
  const [hasAttemptedAutoStart, setHasAttemptedAutoStart] = useState(false);
  const [isAutoStarting, setIsAutoStarting] = useState(false);
  const { templateId: templateIdFromPath } = useParams<{ templateId: string }>();
  
  // Use refs to store the latest function references
  const selectTemplateRef = useRef(selectTemplate);
  const initializeSectionsRef = useRef(initializeSections);
  const startMeetingRef = useRef(startMeeting);
  
  // Update refs when functions change
  useEffect(() => {
    selectTemplateRef.current = selectTemplate;
    initializeSectionsRef.current = initializeSections;
    startMeetingRef.current = startMeeting;
  }, [selectTemplate, initializeSections, startMeeting]);

  // Set auto-starting state when there's a template ID in the path
  useEffect(() => {
    if (templateIdFromPath && !activeMeeting && !hasAttemptedAutoStart) {
      setIsAutoStarting(true);
    } else {
      setIsAutoStarting(false);
    }
  }, [templateIdFromPath, activeMeeting, hasAttemptedAutoStart]);

  // Handle auto-start from URL parameter
  useEffect(() => {
    const handleAutoStart = async () => {
      // Early return if already attempted or conditions not met
      if (hasAttemptedAutoStart || isLoading || templates.length === 0 || activeMeeting) {
        return;
      }

      // Early return if we're on the base start-meeting route
      if (!templateIdFromPath) {
        setHasAttemptedAutoStart(true);
        setIsAutoStarting(false);
        return;
      }


      // Validate templateId format (basic check)
      if (!templateIdFromPath.trim()) {
        console.error('Invalid template ID: empty or whitespace');
        toast.error('Invalid template ID provided');
        setHasAttemptedAutoStart(true);
        setIsAutoStarting(false);
        return;
      }

      // Find the template in the loaded templates
      const templateToStart = templates.find(t => t.template_id === templateIdFromPath);

      if (templateToStart) {
        try {
          // Validate template content structure
          if (!templateToStart.content || typeof templateToStart.content !== 'object') {
            console.error('Invalid template content:', templateToStart.content);
            toast.error('Template has invalid content structure');
            setHasAttemptedAutoStart(true);
            setIsAutoStarting(false);
            return;
          }

          // Select the template first using ref
          await selectTemplateRef.current(templateIdFromPath);
          
          // Initialize sections for the template using ref
          initializeSectionsRef.current(templateToStart.content);
          
          // Start the meeting automatically using ref
          startMeetingRef.current(templateIdFromPath);
          
        } catch (error) {
          console.error('Error auto-starting meeting:', error);
          toast.error('Failed to auto-start meeting. Please try starting manually.');
        }
      } else {
        console.error('Template not found for ID:', templateIdFromPath);
        toast.error('Template not found or you do not have access to it');
      }

      // Mark that we've attempted auto-start regardless of success/failure
      setHasAttemptedAutoStart(true);
      setIsAutoStarting(false);
    };

    handleAutoStart();
  }, [templates, isLoading, hasAttemptedAutoStart, activeMeeting, templateIdFromPath]);

  // Reset auto-start state when the templateId from the URL changes.
  // This allows the auto-start logic to re-trigger if the user navigates
  // to a new meeting link. It also handles browser back/forward navigation.
  useEffect(() => {
    setHasAttemptedAutoStart(false);
    setIsAutoStarting(false);

    const handleUrlChange = () => {
      setHasAttemptedAutoStart(false);
      setIsAutoStarting(false);
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [templateIdFromPath]);

  return { 
    hasAttemptedAutoStart, 
    isAutoStarting: isAutoStarting && !activeMeeting 
  };
}; 