import React from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/utils/formatUtils';
import { toast } from 'sonner';

interface MeetingHeaderProps {
  timer: number;
  onEndMeeting: () => void;
}

/**
 * MeetingHeader component displays the timer and end meeting button
 * at the top of the meeting content area
 */
const MeetingHeader: React.FC<MeetingHeaderProps> = ({
  timer,
  onEndMeeting,
}) => {
  // Handle end meeting with force option
  const handleEndMeeting = () => {
    try {
      // Force stop any reconnection attempts
      if (window.electron) {
        // Notify the user we're forcefully ending the meeting
        toast.info("Ending meeting...");
      }
      
      // Call the provided end meeting handler
      onEndMeeting();
    } catch (error) {
      console.error("Error ending meeting:", error);
      toast.error("Error ending meeting. Please try again.");
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-7 px-4 border-b bg-background/95 backdrop-blur-sm flex justify-between items-center z-50 ">
      <div className="flex items-center gap-1 ">
        <Clock size={12} className="text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">{formatTime(timer)}</span>
        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse ml-0.5"></div>
      </div>
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEndMeeting}
          className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
        >
          End Meeting
        </Button>
      </div>
    </div>
  );
};

export default MeetingHeader;