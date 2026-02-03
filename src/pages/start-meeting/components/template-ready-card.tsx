import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, Clock, Loader2 } from 'lucide-react';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TemplateReadyCardProps {
  templateName: string;
  templateDescription: string;
  isMeetingStarting?: boolean;
  onStartMeeting: () => void;
}

const TemplateReadyCard: React.FC<TemplateReadyCardProps> = ({
  templateName,
  templateDescription,
  isMeetingStarting = false,
  onStartMeeting
}) => {
  return (
    <Card className="mt-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg sm:text-xl">{templateName}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {templateDescription}
          </CardDescription>
        </div>
        <Clock size={20} className="text-muted-foreground" />
      </CardHeader>
      <CardFooter>
        <Button 
          className="w-full text-xs sm:text-sm py-1.5 sm:py-2" 
          onClick={onStartMeeting}
          disabled={isMeetingStarting}
        >
          {isMeetingStarting ? (
            <>
              <Loader2 size={16} className="mr-1 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <PlayCircle size={16} className="mr-1" />
              Start Meeting
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TemplateReadyCard;
