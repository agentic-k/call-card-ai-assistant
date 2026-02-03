import React, { useRef, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, Tag, Pause, Play } from 'lucide-react';
import { ClassifyTextResponse } from '@/types/text-classifier';

// Access environment variables - NODE_ENV is not automatically available in Vite
// Use MODE, DEV, or PROD instead
const mode = import.meta.env.MODE; // 'development' or 'production'
const isDev = import.meta.env.DEV; // boolean
const isProd = import.meta.env.PROD; // boolean

interface TranscriptEntry {
  timestamp: number;
  text: string;
  isFinal: boolean;
  speaker?: string;
}

interface LiveTabProps {
  transcriptEntries: TranscriptEntry[];
  meetingStartTime: number | null | undefined;
  isTranscribing?: boolean;
  isUserTranscribing?: boolean;
  isSpeakerTranscribing?: boolean;
  currentClassification?: ClassifyTextResponse | null;
  isClassifying?: boolean;
  onPauseResume?: () => void;
  isPaused?: boolean;
  connectionStatus?: 'pending' | 'active' | 'failed' | 'reconnecting';
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
}

const LiveTab: React.FC<LiveTabProps> = ({
  transcriptEntries,
  isUserTranscribing = false,
  isSpeakerTranscribing = false,
  currentClassification = null,
  isClassifying = false,
  onPauseResume,
  isPaused = false,
  connectionStatus = 'pending',
  reconnectAttempt = 0,
  maxReconnectAttempts = 5
}) => {
  const endOfTranscriptRef = useRef<HTMLDivElement>(null);


  const mergedEntries = useMemo(() => {
    if (!transcriptEntries || transcriptEntries.length === 0) {
      return [];
    }
    const result: TranscriptEntry[] = [];
    transcriptEntries.forEach(entry => {
      // Don't merge interim results
      if (!entry.isFinal) {
        result.push(entry);
        return;
      }

      const speaker = entry.speaker || 'User';
      const lastEntry = result.length > 0 ? result[result.length - 1] : null;

      if (lastEntry && lastEntry.speaker === speaker && lastEntry.isFinal) {
        lastEntry.text += ` ${entry.text}`;
      } else {
        result.push({ ...entry, speaker });
      }
    });
    return result;
  }, [transcriptEntries]);

  useEffect(() => {
    endOfTranscriptRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mergedEntries]);

  // Helper function to get badge variant based on label
  const getClassificationBadgeVariant = (label: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (label) {
      case 'pain_point':
      case 'technical_issue':
      case 'negative':
        return 'destructive';
      case 'use_case':
      case 'feature_request':
        return 'default';
      case 'positive':
      case 'product_feedback':
        return 'secondary';
      case 'neutral':
      case 'status_update':
        return 'secondary';
      case 'error':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Helper function to get connection status configuration
  const getConnectionStatusConfig = (status: typeof connectionStatus) => {
    switch (status) {
      case 'pending':
        return {
          variant: 'secondary' as const,
          label: 'Connecting',
          className: 'animate-pulse'
        };
      case 'active':
        return {
          variant: 'default' as const,
          label: 'Connected',
          className: ''
        };
      case 'reconnecting':
        return {
          variant: 'secondary' as const,
          label: `Reconnecting (${reconnectAttempt}/${maxReconnectAttempts})`,
          className: 'animate-pulse'
        };
      case 'failed':
        return {
          variant: 'destructive' as const,
          label: 'Disconnected',
          className: ''
        };
      default:
        return {
          variant: 'secondary' as const,
          label: 'Unknown',
          className: ''
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Pause/Resume Button and Connection Status */}
      <div className="flex justify-between items-center">
        {/* Connection Status Badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant={getConnectionStatusConfig(connectionStatus).variant}
            className={getConnectionStatusConfig(connectionStatus).className}
          >
            {getConnectionStatusConfig(connectionStatus).label}
          </Badge>
        </div>



        {isDev && (
          <div>
            {/* Pause/Resume Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onPauseResume}
              className="gap-2"
              disabled={!onPauseResume}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              )}
            </Button>
          </div>
        )}
      </div>


      {/* Classification Display - Only shown when we have a valid classification from a final transcript */}
      {isDev && (
        <div>
          {((currentClassification && currentClassification.label !== 'none') || isClassifying) && (
            <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Classification</span>
                  {!transcriptEntries.some(entry => entry.isFinal) && !isClassifying && (
                    <span className="text-xs text-muted-foreground ml-2">(Waiting for final transcript)</span>
                  )}
                </div>
                {isClassifying ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">Processing</span>
                  </div>
                ) : (
                  <Badge variant={getClassificationBadgeVariant(currentClassification?.label || 'none')}>
                    {currentClassification?.label || 'none'}
                  </Badge>
                )}
              </div>
              {isClassifying ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Score:</span>{' '}
                    <Skeleton className="inline-block h-3 w-10" />
                  </div>
                  <div>
                    <span className="text-muted-foreground">EMA:</span>{' '}
                    <Skeleton className="inline-block h-3 w-10" />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Matches:</span>{' '}
                    <Skeleton className="inline-block h-3 w-10" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Score:</span>{' '}
                    <span className="font-mono">{currentClassification?.score.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">EMA:</span>{' '}
                    <span className="font-mono">{currentClassification?.ema.toFixed(2)}</span>
                  </div>
                  {currentClassification?.matches !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Matches:</span>{' '}
                      <span className="font-mono">{currentClassification.matches}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mergedEntries.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-center p-4">
          <div className="text-muted-foreground">
            <p className="text-sm">Waiting for speech...</p>
            <p className="text-xs mt-1">Start speaking to see the live transcript</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pr-4">
          {mergedEntries.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className="grid grid-cols-[auto_1fr] gap-x-3 items-start"
            >
              <div className="pt-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant={entry.speaker === 'Speaker' ? 'secondary' : 'default'}>
                    {entry.speaker === 'Speaker' ? 'Speaker' : 'User'}
                  </Badge>
                  {entry.speaker === 'User' && isUserTranscribing && !entry.isFinal && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                  {entry.speaker === 'Speaker' && isSpeakerTranscribing && !entry.isFinal && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />)
                  }
                </div>
              </div>
              <div>
                <p className={`text-sm leading-relaxed ${!entry.isFinal ? 'text-muted-foreground' : ''}`}>
                  {entry.text}
                </p>
              </div>
            </div>
          ))}
          {(isUserTranscribing || isSpeakerTranscribing) && (
            <div className="grid grid-cols-[auto_1fr] gap-x-3 items-start opacity-70">
              <div className="pt-0.5">
                <div className="flex items-center gap-2">
                  {isUserTranscribing && (
                    <Badge variant="default">User</Badge>
                  )}
                  {isSpeakerTranscribing && (
                    <Badge variant="secondary">Speaker</Badge>
                  )}
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Transcribing...
                </p>
              </div>
            </div>
          )}
          <div ref={endOfTranscriptRef} />
        </div>
      )}
    </div>
  );
};

export default LiveTab; 