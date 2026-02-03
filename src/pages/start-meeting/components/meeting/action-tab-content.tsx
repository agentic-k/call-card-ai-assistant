import React from 'react';
import { Button } from '@/components/ui/button';

interface ActionTabContentProps {
  callSummary: string;
  nextStep: string;
  onEndMeeting: () => void;
}

/**
 * ActionTabContent component displays the call summary, next steps,
 * and confirmation button for the meeting
 */
const ActionTabContent: React.FC<ActionTabContentProps> = ({
  callSummary,
  nextStep,
  onEndMeeting,
}) => {
  return (
    <div className="p-4 space-y-4">
      {/* Compact Call Summary Section */}
      <div className="space-y-0.5">
        <h2 className="text-sm font-medium">Call Summary:</h2>
        <p className="text-muted-foreground text-[11px]">{callSummary}</p>
      </div>

      {/* Compact Next Step Section */}
      <div className="space-y-0.5">
        <h2 className="text-blue-500 text-sm font-medium">Next Step:</h2>
        <p className="text-muted-foreground text-[11px]">{nextStep}</p>
      </div>

      {/* Compact Confirm Meeting Button */}
      <Button
        className="w-full py-1 text-xs font-medium"
        onClick={onEndMeeting}
      >
        Confirm Meeting
      </Button>
    </div>
  );
};

export default ActionTabContent;
