// Inkline Backend Types

export type Rating = 'green' | 'amber' | 'red';

export interface DimensionRating {
  rating: Rating;
  label: string;
}

export interface CounterSource {
  outlet: string;
  lean: string;       // e.g. "center", "left-lean", "right-lean"
  headline: string;    // article title or suggested angle
  url: string;         // link to the article
  snippet?: string;    // brief excerpt from the article
  isReal: boolean;     // true if from web search, false if AI-generated
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
  counterSources?: CounterSource[];   // suggested alternative perspectives
  videoAnalysis?: string;              // AI description of video content if present
  hasVideo?: boolean;                  // whether the post contains video
}

export interface AnalyzeRequest {
  text: string;
  author?: string;
  hasVideo?: boolean;
  videoDescription?: string;   // alt text or visible description of video
  videoThumbnailUrl?: string;  // poster/thumbnail image URL for the video
  imageUrls?: string[];        // any image URLs found in the tweet
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
  cached?: boolean;
}
