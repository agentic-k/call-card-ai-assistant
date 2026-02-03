// Input payload sent to the lead-scoring agent
export interface LeadScoringRequest {
  framework: string;
  questions: string[];
  transcript: {
    turns: Array<{
      speaker: string;
      text: string;
    }>;
  };
}

// Output payload returned by the lead-scoring agent
export interface LeadScoringResponse {
  framework: string;
  questions: Array<{
    question: string;
    status:
      | "answered_by_buyer"
      | "answered_via_confirmation"
      | "partial_or_unclear"
      | "unanswered";
    asked: boolean;
    confidence: number; // 0.0–1.0, two-decimal precision on the wire
    evidence: string;
    turn_ids: number[];
  }>;
  nextBestQuestions: string[];
  summary: string;
}
