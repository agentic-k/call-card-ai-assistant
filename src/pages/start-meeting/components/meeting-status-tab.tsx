import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime } from '@/utils/formatUtils';

interface MeetingStatusTabProps {
  timer: number;
  completedQuestions: Array<{ id: string; text: string; status: 'asked' | 'skipped' }>;
  totalQuestions: number;
  isRecording: boolean;
  connectionStatus: 'pending' | 'active' | 'failed' | 'reconnecting';
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
}

const MeetingStatusTab: React.FC<MeetingStatusTabProps> = ({
  timer,
  completedQuestions,
  totalQuestions,
  isRecording,
  connectionStatus,
  reconnectAttempt = 0,
  maxReconnectAttempts = 5
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState(completedQuestions.length);

  // Get status configuration
  const getStatusConfig = (status: typeof connectionStatus) => {
    switch (status) {
      case 'pending':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-400/20',
          dotColor: 'fill-amber-400',
          label: 'Connecting',
          pulse: true
        };
      case 'active':
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-400/20',
          dotColor: 'fill-emerald-400',
          label: 'Live',
          pulse: false
        };
      case 'reconnecting':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-orange-400/20',
          dotColor: 'fill-orange-400',
          label: 'Reconnecting',
          pulse: true
        };
      case 'failed':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          dotColor: 'fill-red-400',
          label: 'Disconnected',
          pulse: false
        };
    }
  };

  const statusConfig = getStatusConfig(connectionStatus);

  return (
    <div className="w-full">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Meeting Status</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 w-7 p-0 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
          </Button>
        </CardHeader>
        <CardContent>
          {!isMinimized ? (
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Circle 
                      className={cn(
                        "w-2.5 h-2.5 transition-all duration-300",
                        statusConfig.dotColor,
                        statusConfig.pulse && "animate-pulse"
                      )} 
                    />
                    {statusConfig.pulse && (
                      <div className={cn(
                        "absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping",
                        statusConfig.color.replace('text-', 'bg-')
                      )} />
                    )}
                  </div>
                  <span className="text-sm font-medium">Connection Status</span>
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide",
                  statusConfig.bgColor,
                  statusConfig.color
                )}>
                  {statusConfig.label}
                  {connectionStatus === 'reconnecting' && (
                    <span className="ml-1 opacity-75">
                      ({reconnectAttempt}/{maxReconnectAttempts})
                    </span>
                  )}
                </div>
              </div>

              {/* Questions Progress */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Questions Asked</span>
                <Badge variant="secondary">
                  <span className={cn(
                    "inline-block transition-all duration-300 ease-out",
                    currentQuestions !== completedQuestions.length && "scale-110 text-emerald-500"
                  )}>
                    {completedQuestions.length}
                  </span>
                  /{totalQuestions}
                </Badge>
              </div>

              {/* Time Elapsed */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Time Elapsed</span>
                <Badge variant="secondary">{formatTime(timer)}</Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Circle 
                    className={cn(
                      "w-3 h-3 transition-all duration-300",
                      statusConfig.dotColor,
                      statusConfig.pulse && "animate-pulse"
                    )} 
                  />
                  {statusConfig.pulse && (
                    <div className={cn(
                      "absolute inset-0 w-3 h-3 rounded-full animate-ping",
                      statusConfig.color.replace('text-', 'bg-')
                    )} />
                  )}
                </div>
                <span className="text-sm font-medium">{completedQuestions.length}/{totalQuestions} Questions</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MeetingStatusTab; 