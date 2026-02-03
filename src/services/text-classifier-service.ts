import { v4 as uuidv4 } from 'uuid';
import { ClassifyTextRequest, ClassifyTextResponse } from '@/types/text-classifier';
import { ElectronAPI } from '@/types/electron';

/**
 * Service for handling text classification via IPC
 */
class TextClassifierService {
  private electron: ElectronAPI | undefined;
  
  constructor() {
    this.electron = window.electron;
    
    if (!this.electron?.classifyText) {
      console.warn('TextClassifierService: Electron API not available or missing classifyText method');
    }
  }
  
  /**
   * Check if the service is available (electron API exists)
   */
  isAvailable(): boolean {
    return !!this.electron?.classifyText;
  }
  
  /**
   * Classify a text segment
   * @param text The text to classify
   * @param source Optional source identifier (e.g., 'user', 'speaker')
   * @param isFinal Whether this is a final transcript
   * @returns Classification result or null if service unavailable
   */
  async classifyText(
    text: string, 
    source: string = 'unknown',
    isFinal: boolean = true
  ): Promise<ClassifyTextResponse | null> {
    if (!this.isAvailable()) {
      console.warn('TextClassifierService: Service not available, skipping classification');
      return null;
    }
    
    if (!text.trim()) {
      console.warn('TextClassifierService: Empty text provided, skipping classification');
      return null;
    }
    
    try {
      const requestId = uuidv4();
      console.log(`[TextClassifierService] Creating classification request ID: ${requestId}`);
      console.log(`[TextClassifierService] Text length: ${text.length}, Source: ${source}, Final: ${isFinal}`);
      
      const request: ClassifyTextRequest = {
        id: requestId,
        text,
        metadata: {
          source,
          timestamp: Date.now(),
          isFinal
        }
      };
      
      console.log(`[TextClassifierService] Sending request to Electron IPC: ${requestId}`);
      const response = await this.electron!.classifyText(request);
      console.log(`[TextClassifierService] Received response for ${requestId}: ${response.label} (${response.score.toFixed(2)})`);
      return response;
    } catch (error) {
      console.error('TextClassifierService: Classification error', error);
      const errorId = uuidv4();
      console.error(`[TextClassifierService] Error ID: ${errorId}`, error instanceof Error ? error.stack : 'No stack trace');
      return {
        id: errorId,
        label: 'error',
        score: 0,
        ema: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown classification error'
      };
    }
  }
}

// Export singleton instance
export const textClassifierService = new TextClassifierService();

// Export the class for testing or custom instances
export default TextClassifierService;
