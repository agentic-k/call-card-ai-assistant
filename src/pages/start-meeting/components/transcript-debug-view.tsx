import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TranscriptEvent {
  timestamp: number;
  type: 'interim' | 'final';
  text: string;
  confidence?: number;
  raw: any;
}

interface TranscriptDebugViewProps {
  isRecording: boolean;
}

// Global store for transcript events (persists across component rerenders)
let transcriptEvents: TranscriptEvent[] = [];
let listeners: Array<() => void> = [];

// Add event to the global store
export const addTranscriptEvent = (event: TranscriptEvent) => {
  transcriptEvents.push(event);
  // Keep only last 50 events to prevent memory issues
  if (transcriptEvents.length > 50) {
    transcriptEvents = transcriptEvents.slice(-50);
  }
  // Notify all listeners
  listeners.forEach(listener => listener());
};

// Clear all events
export const clearTranscriptEvents = () => {
  transcriptEvents = [];
  listeners.forEach(listener => listener());
};

const TranscriptDebugView: React.FC<TranscriptDebugViewProps> = ({ isRecording }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [events, setEvents] = useState<TranscriptEvent[]>(transcriptEvents);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to transcript events
  useEffect(() => {
    const updateEvents = () => {
      setEvents([...transcriptEvents]);
    };
    
    listeners.push(updateEvents);
    
    return () => {
      listeners = listeners.filter(l => l !== updateEvents);
    };
  }, []);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const copyAllEvents = async () => {
    const allText = events.map(event => 
      `[${new Date(event.timestamp).toLocaleTimeString()}] ${event.type.toUpperCase()}: ${event.text}`
    ).join('\n');
    await copyToClipboard(allText);
  };

  const copyRawData = async () => {
    const rawData = JSON.stringify(events.map(e => e.raw), null, 2);
    await copyToClipboard(rawData);
  };

  if (!isExpanded) {
    return (
      <Card className="mb-4">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Transcript Debug</CardTitle>
              <Badge variant={isRecording ? "default" : "secondary"}>
                {isRecording ? `Live (${events.length})` : `Stopped (${events.length})`}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Transcript Debug - Raw Deepgram Data</CardTitle>
            <Badge variant={isRecording ? "default" : "secondary"}>
              {isRecording ? `Live (${events.length})` : `Stopped (${events.length})`}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAllEvents}
              className="h-6 px-2 text-xs"
              disabled={events.length === 0}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Text
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyRawData}
              className="h-6 px-2 text-xs"
              disabled={events.length === 0}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Raw
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearTranscriptEvents}
              className="h-6 px-2 text-xs"
              disabled={events.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-64" ref={scrollRef}>
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No transcript events yet. Start recording to see real-time data from Deepgram.
              </p>
            ) : (
              events.map((event, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border text-xs ${
                    event.type === 'final' 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                      : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={event.type === 'final' ? 'default' : 'secondary'} className="text-xs">
                        {event.type.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}.{String(event.timestamp % 1000).padStart(3, '0')}
                      </span>
                      {event.confidence && (
                        <span className="text-muted-foreground">
                          {Math.round(event.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(event.text)}
                      className="h-4 w-4 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="font-medium">
                    "{event.text}"
                  </div>
                  {event.raw && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Raw Data
                      </summary>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(event.raw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TranscriptDebugView; 