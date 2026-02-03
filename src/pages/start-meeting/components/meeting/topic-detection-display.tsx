import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrendingUp, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface DetectedTopic {
  id: string;
  label: string;
  confidence: number;
  detectionCount: number;
  lastDetected: number;
}

interface TopicDetectionDisplayProps {
  topics: DetectedTopic[];
  isClassifying?: boolean;
  maxTopics?: number;
}

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const secondsAgo = Math.round((now - timestamp) / 1000);

  if (secondsAgo < 5) return 'just now';
  if (secondsAgo < 60) return `${secondsAgo}s ago`;

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  
  const hoursAgo = Math.floor(minutesAgo / 60);
  return `${hoursAgo}h ago`;
};

/**
 * Displays up to 3 detected topics, highlighting the most discussed one.
 * Aims to reduce cognitive load by removing stats and percentages.
 */
const TopicDetectionDisplay: React.FC<TopicDetectionDisplayProps> = ({
  topics,
  isClassifying = false,
  maxTopics = 3,
}) => {
  // Force re-render to update time ago display
  const [, setForceRender] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setForceRender(prev => prev + 1);
    }, 5000); // Update every 5 seconds
    return () => clearInterval(timer);
  }, []);

  // Sort topics by detection count to find the most discussed ones
  const topTopics = topics
    // Sort by detection count
    .sort((a, b) => b.detectionCount - a.detectionCount)
    .slice(0, maxTopics);

  // Default icon for all topics
  const getTopicIcon = () => {
    return <MessageSquare className="h-4 w-4 text-blue-500" />;
  };
  
  // Default badge variant for all topics
  const getBadgeVariant = (): 'default' | 'destructive' | 'secondary' | 'outline' => {
    return 'secondary';
  };

  return (
    <div>
      {/* Header section */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-foreground">Detected Topics</h3>
        {isClassifying && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            <span>Analyzing...</span>
          </div>
        )}
      </div>

      {/* Main content area to display the topics */}
      <div className="space-y-2">
        <AnimatePresence>
          {topTopics.length > 0 ? (
            topTopics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className={`p-3 transition-colors ${index === 0 ? 'bg-primary/10' : 'bg-card/50'}`}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getTopicIcon()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={topic.label}>
                          {topic.label}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getBadgeVariant()}
                            className="text-[10px] px-1.5 py-0 mt-1"
                          >
                            Topic
                          </Badge>
                          {index === 0 && topics.length > 1 ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 mt-1"
                            >
                              Most Discussed ({topic.detectionCount}x)
                            </Badge>
                          ) : topic.detectionCount > 1 ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 mt-1"
                            >
                              {topic.detectionCount}x
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {formatTimeAgo(topic.lastDetected)}
                    </span>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center text-muted-foreground text-sm pt-4"
            >
              {isClassifying ? 'Listening for topics...' : 'No topics detected'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TopicDetectionDisplay;
