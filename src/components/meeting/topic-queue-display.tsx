import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTopicQueue } from '@/hooks/useTopicQueue';

interface TopicQueueDisplayProps {
  className?: string;
}

export const TopicQueueDisplay: React.FC<TopicQueueDisplayProps> = ({
  className,
}) => {
  const { getRecentTopics, getTimeRemaining } = useTopicQueue();
  const [, setUpdateTrigger] = useState(0);

  // Force update every second to update time remaining
  useEffect(() => {
    const intervalId = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const topics = getRecentTopics();

  if (topics.length === 0) {
    return null;
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Recent Topics
        </h3>
        <div className="space-y-2">
          {topics.map(topic => {
            const timeRemaining = getTimeRemaining(topic.id);
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            
            return (
              <div
                key={topic.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex-1 truncate">{topic.topic}</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
