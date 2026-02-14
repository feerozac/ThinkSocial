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
  stance?: string;     // "supporting", "counter", or "neutral" relative to the post
  isReal: boolean;     // true if from web search, false if AI-generated
}

export interface HighlightedComment {
  author: string;
  text: string;
  reason: string;              // why this comment is notable (e.g. "offers counter-evidence")
  sentiment: 'agree' | 'disagree' | 'nuanced' | 'neutral';
}

export interface CommentAnalysis {
  overallTone: string;         // e.g. "Predominantly critical with some supportive voices"
  leaningSummary: string;      // 1-2 sentences on the ideological lean of the comment section
  highlights: HighlightedComment[];  // notable comments worth reading
  agreementLevel: 'echo-chamber' | 'mostly-agree' | 'mixed' | 'mostly-disagree' | 'polarised';
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
  counterPerspective?: string;         // articulation of an alternative viewpoint
  counterSources?: CounterSource[];    // web articles with stance labels
  commentAnalysis?: CommentAnalysis;   // summary of comment section tone and perspectives
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
  comments?: string[];         // visible comment/reply texts from the post
  depth?: 'quick' | 'deep';   // quick = traffic light only, deep = full analysis
}

export interface QuickResult {
  overall: Rating;
  summary: string;             // one-liner
  confidence: number;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: AnalysisResult;
  quickResult?: QuickResult;   // returned for depth=quick
  error?: string;
  cached?: boolean;
}
