import { useState, useCallback, useEffect } from 'react';
import { ClassifyTextResponse } from '@/types/text-classifier';
import { ActiveTopic } from '../components/meeting/active-topics-display';

const MEMORY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const CONFIDENCE_THRESHOLD = 0.4; // 40% minimum confidence
const MAX_TOPICS = 3; // Maximum number of active topics to show

interface TopicMemoryEntry {
  id: string;
  title: string;
  type: 'useCase' | 'painPoint' | 'section';
  confidenceScores: number[];
  matchCount: number;
  lastMentioned: number;
  questions: string[];
}

export const useTopicMemory = () => {
  const [topicMemory, setTopicMemory] = useState<Map<string, TopicMemoryEntry>>(new Map());

  // Clean up old topics
  const cleanupOldTopics = useCallback(() => {
    const now = Date.now();
    setTopicMemory(prev => {
      const newMemory = new Map(prev);
      for (const [id, entry] of newMemory.entries()) {
        if (now - entry.lastMentioned > MEMORY_WINDOW_MS) {
          newMemory.delete(id);
        }
      }
      return newMemory;
    });
  }, []);

  // Run cleanup periodically
  useEffect(() => {
    const interval = setInterval(cleanupOldTopics, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [cleanupOldTopics]);

  // Update topic memory with new classification
  const updateTopicMemory = useCallback((classification: ClassifyTextResponse | null) => {
    if (!classification || classification.score < CONFIDENCE_THRESHOLD) return;

    setTopicMemory(prev => {
      const newMemory = new Map(prev);
      const topicId = classification.label;

      // Determine topic type based on label
      let type: 'useCase' | 'painPoint' | 'section';
      if (classification.label.includes('pain_point') || classification.label.includes('negative')) {
        type = 'painPoint';
      } else if (classification.label.includes('use_case') || classification.label.includes('positive')) {
        type = 'useCase';
      } else {
        type = 'section';
      }

      // Get or create topic entry
      const existingEntry = newMemory.get(topicId);
      if (existingEntry) {
        existingEntry.confidenceScores.push(classification.score);
        existingEntry.matchCount++;
        existingEntry.lastMentioned = Date.now();
        // Keep only last 10 confidence scores
        if (existingEntry.confidenceScores.length > 10) {
          existingEntry.confidenceScores = existingEntry.confidenceScores.slice(-10);
        }
      } else {
        // Create new entry
        newMemory.set(topicId, {
          id: topicId,
          title: classification.label.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          type,
          confidenceScores: [classification.score],
          matchCount: 1,
          lastMentioned: Date.now(),
          questions: generateQuestionsForTopic(classification.label, type)
        });
      }

      return newMemory;
    });
  }, []);

  // Convert memory to active topics for display
  const getActiveTopics = useCallback((): ActiveTopic[] => {
    const now = Date.now();
    const topics: ActiveTopic[] = [];

    for (const entry of topicMemory.values()) {
      if (now - entry.lastMentioned <= MEMORY_WINDOW_MS) {
        // Calculate average confidence
        const avgConfidence = entry.confidenceScores.reduce((a, b) => a + b, 0) / entry.confidenceScores.length;

        topics.push({
          id: entry.id,
          title: entry.title,
          type: entry.type,
          confidence: avgConfidence,
          matchCount: entry.matchCount,
          lastMentioned: entry.lastMentioned,
          questions: entry.questions
        });
      }
    }

    // Sort by confidence and limit to MAX_TOPICS
    return topics
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_TOPICS);
  }, [topicMemory]);

  return {
    updateTopicMemory,
    getActiveTopics
  };
};

// Helper function to generate relevant questions based on topic type
function generateQuestionsForTopic(label: string, type: 'useCase' | 'painPoint' | 'section'): string[] {
  const baseQuestions = {
    useCase: [
      'What specific requirements do you have for this use case?',
      'Who are the primary users or stakeholders?',
      'What metrics would define success?'
    ],
    painPoint: [
      'How is this issue impacting your operations?',
      'What solutions have you tried before?',
      'What would an ideal resolution look like?'
    ],
    section: [
      'Could you elaborate on this topic?',
      'What are your main concerns here?',
      'How does this fit into your overall strategy?'
    ]
  };

  // Return base questions for the topic type
  return baseQuestions[type];
}
