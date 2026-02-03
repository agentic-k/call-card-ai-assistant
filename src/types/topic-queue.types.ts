export interface TopicQueueItem {
  id: string;
  topic: string;
  timestamp: number; // Unix timestamp in milliseconds
}

export interface TopicQueue {
  items: TopicQueueItem[];
  maxAgeMs: number; // Maximum age of items in milliseconds
}
