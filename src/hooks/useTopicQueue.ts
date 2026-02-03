import { useState, useEffect, useCallback } from 'react';
import { TopicQueue, TopicQueueItem } from '@/types/topic-queue.types';

const MAX_AGE_MS = 3 * 60 * 1000; // 3 minutes in milliseconds
const CLEANUP_INTERVAL_MS = 10 * 1000; // Check for expired items every 10 seconds

export const useTopicQueue = () => {
  const [queue, setQueue] = useState<TopicQueue>({
    items: [],
    maxAgeMs: MAX_AGE_MS,
  });

  // Add a new topic to the queue
  const addTopic = useCallback((topic: string) => {
    const now = Date.now();
    const newItem: TopicQueueItem = {
      id: `topic_${now}_${Math.random().toString(36).substr(2, 9)}`,
      topic,
      timestamp: now,
    };

    setQueue(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  // Remove expired items
  const cleanupExpiredItems = useCallback(() => {
    const now = Date.now();
    setQueue(prev => ({
      ...prev,
      items: prev.items.filter(item => now - item.timestamp <= prev.maxAgeMs),
    }));
  }, []);

  // Automatically cleanup expired items
  useEffect(() => {
    const intervalId = setInterval(cleanupExpiredItems, CLEANUP_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [cleanupExpiredItems]);

  // Get topics sorted by timestamp (newest first)
  const getRecentTopics = useCallback(() => {
    return [...queue.items].sort((a, b) => b.timestamp - a.timestamp);
  }, [queue.items]);

  // Get time remaining for a topic in seconds
  const getTimeRemaining = useCallback((topicId: string) => {
    const item = queue.items.find(i => i.id === topicId);
    if (!item) return 0;

    const now = Date.now();
    const timeElapsed = now - item.timestamp;
    const timeRemaining = Math.max(0, queue.maxAgeMs - timeElapsed);
    return Math.floor(timeRemaining / 1000); // Convert to seconds
  }, [queue.items, queue.maxAgeMs]);

  return {
    addTopic,
    getRecentTopics,
    getTimeRemaining,
    cleanupExpiredItems,
  };
};
