import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneCall, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTemplates } from '@/hooks/useTemplates';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Template } from '@/services/templatesFunction';
import { useChecklistStore } from '@/store/checklistStore';

interface MeetingStartButtonProps {
  templateId?: string | null;
  eventTitle?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
  disabled?: boolean;
}

/**
 * MeetingStartButton Component
 * 
 * A button that starts a meeting with a specific template.
 * Shows a confirmation dialog before starting the meeting.
 * Navigates to the start-meeting page with the template ID.
 */
export function MeetingStartButton({
  templateId,
  eventTitle,
  size = 'default',
  variant = 'default',
  className,
  disabled = false
}: MeetingStartButtonProps) {
  const navigate = useNavigate();
  const { templates, isLoading } = useTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const initializeSections = useChecklistStore(state => state.initializeSections);

  // Find the template by ID
  const template = templateId 
    ? templates.find(t => t.template_id === templateId) 
    : null;

  // Handle start meeting button click
  const handleStartMeeting = () => {
    if (!templateId) {
      toast.error('No template linked to this event');
      return;
    }
    
    setIsDialogOpen(true);
  };

  // Handle confirm start meeting
  const handleConfirmStart = async () => {
    if (!templateId || !template) {
      toast.error('Template not found');
      setIsDialogOpen(false);
      return;
    }

    setIsStarting(true);
    
    try {
      // Initialize sections before navigating
      if (template.content) {
        initializeSections(template.content);
      }
      
      // Navigate to start meeting page with template ID
      navigate(`/start-meeting/${templateId}`);
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast.error('Failed to start meeting');
      setIsStarting(false);
      setIsDialogOpen(false);
    }
  };

  // If no template ID is provided, render a disabled button
  if (!templateId) {
    return (
      <Button 
        variant="outline" 
        size={size} 
        disabled 
        className={className}
        title="No template linked to this event"
      >
        <PhoneCall className="h-4 w-4 mr-2" />
        Start Meeting
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleStartMeeting}
        className={className}
        disabled={isLoading || disabled}
      >
        {size === 'icon' ? (
          <PhoneCall className="h-4 w-4" />
        ) : (
          <>
            <PhoneCall className="h-4 w-4 mr-2" />
            Start Meeting
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Meeting</DialogTitle>
            <DialogDescription>
              {eventTitle ? (
                <>Start meeting for event: <strong>{eventTitle}</strong></>
              ) : (
                <>Start meeting with template: <strong>{template?.template_name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will open the meeting interface with the selected template.
              {template?.description && (
                <>
                  <br /><br />
                  <span className="font-medium">Template description:</span><br />
                  {template.description}
                </>
              )}
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStart}
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Start Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
