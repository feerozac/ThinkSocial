// Shared types for Think Social

export type Rating = 'green' | 'amber' | 'red';

export interface DimensionRating {
  rating: Rating;
  label: string;
}

export interface AnalysisResult {
  overall: Rating;
  perspective: DimensionRating;
  verification: DimensionRating;
  balance: DimensionRating;
  source: DimensionRating;
  tone: DimensionRating;
  summary: string;
  confidence: number;
}

export interface AnalyzeRequest {
  text: string;
  author?: string;
  url?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
  cached?: boolean;
}

// Message types for extension communication
export interface ContentToBackgroundMessage {
  type: 'ANALYZE_POST';
  payload: {
    tweetId: string;
    text: string;
    author: string;
  };
}

export interface BackgroundToContentMessage {
  type: 'ANALYSIS_RESULT';
  payload: {
    tweetId: string;
    analysis: AnalysisResult | null;
    error?: string;
  };
}
