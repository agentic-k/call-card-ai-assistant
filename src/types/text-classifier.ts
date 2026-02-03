/**
 * TypeScript interfaces for text classification IPC communication
 */

/**
 * Topic definition for classification
 */
export interface ClassificationTopic {
  /**
   * Display label for the topic
   */
  label: string;
  
  /**
   * Description of the topic for semantic matching
   */
  description: string;
  
  /**
   * Optional unique identifier for the topic
   */
  id?: string;
  
  /**
   * Optional keywords that indicate this topic (legacy)
   */
  keywords?: string[];
  
  /**
   * Optional threshold score for matching (0-1)
   */
  threshold?: number;
}

/**
 * Request object for text classification
 */
export interface ClassifyTextRequest {
  /**
   * Unique identifier for the request
   */
  id: string;
  
  /**
   * Text content to classify
   */
  text: string;
  
  /**
   * Optional custom topics to use for classification
   */
  topics?: ClassificationTopic[];
  
  /**
   * Optional metadata about the text
   */
  metadata?: {
    /**
     * Source of the text (e.g., 'user', 'speaker')
     */
    source?: string;
    
    /**
     * Timestamp when the text was captured
     */
    timestamp?: number;
    
    /**
     * Whether this is a final transcript or interim
     */
    isFinal?: boolean;
  };
}

/**
 * Response object from text classification
 */
export interface ClassifyTextResponse {
  /**
   * Identifier matching the request
   */
  id: string;
  
  /**
   * Classification label assigned to the text
   * Common values: 'use_case', 'pain_point', 'positive', 'negative', 'neutral', 'error'
   */
  label: string;
  
  /**
   * Confidence score for the classification (0-1)
   */
  score: number;
  
  /**
   * Exponential moving average of scores for this label type
   */
  ema: number;
  
  /**
   * Number of keyword matches found
   */
  matches?: number;
  
  /**
   * Timestamp when the classification was performed
   */
  timestamp: number;
  
  /**
   * Error message if classification failed
   */
  error?: string;
}
