// Think Social Backend Types

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
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
  cached?: boolean;
}
