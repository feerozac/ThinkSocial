// Inkline - Background Service Worker
// Handles API communication and caching
// Supports two-tier analysis: quick scan (automatic) + deep analysis (on hover)

interface CounterSource {
  outlet: string;
  lean: string;
  headline: string;
  url: string;
  snippet?: string;
  isReal: boolean;
}

interface CommentAnalysis {
  overallTone: string;
  leaningSummary: string;
  highlights: Array<{ author: string; text: string; reason: string; sentiment: string }>;
  agreementLevel: string;
}

interface DimensionRating {
  rating: 'green' | 'amber' | 'red';
  label: string;
  reason?: string;
}

interface AnalysisResult {
  overall: 'green' | 'amber' | 'red';
  perspective: DimensionRating;
  verification: DimensionRating;
  balance: DimensionRating;
  source: DimensionRating;
  tone: DimensionRating;
  summary: string;
  confidence: number;
  counterPerspective?: string;
  counterSources?: CounterSource[];
  commentAnalysis?: CommentAnalysis;
  videoAnalysis?: string;
  hasVideo?: boolean;
}

interface QuickResult {
  overall: 'green' | 'amber' | 'red';
  summary: string;
  confidence: number;
}

interface CacheEntry {
  analysis: AnalysisResult;
  timestamp: number;
}

// API endpoint - update this when deployed
const API_URL = 'http://localhost:3001/api/analyze';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_KEY = 'inkline_daily_count';
const DAILY_LIMIT = 200; // Raised for development; set to 50 for production

// Simple hash function for cache keys
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'ts_' + Math.abs(hash).toString(36);
}

// Get cached deep analysis from local storage
async function getCachedAnalysis(text: string): Promise<AnalysisResult | null> {
  const key = hashText(text);
  const result = await chrome.storage.local.get(key);
  
  if (result[key]) {
    const entry: CacheEntry = result[key];
    if (Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.analysis;
    } else {
      await chrome.storage.local.remove(key);
    }
  }
  return null;
}

// Save deep analysis to local cache
async function cacheAnalysis(text: string, analysis: AnalysisResult): Promise<void> {
  const key = hashText(text);
  await chrome.storage.local.set({ [key]: { analysis, timestamp: Date.now() } });
}

// Rate limiting
async function checkRateLimit(): Promise<boolean> {
  const today = new Date().toDateString();
  const result = await chrome.storage.local.get(RATE_LIMIT_KEY);
  
  if (result[RATE_LIMIT_KEY]) {
    const { date, count } = result[RATE_LIMIT_KEY];
    if (date === today) {
      if (count >= DAILY_LIMIT) return false;
      await chrome.storage.local.set({ [RATE_LIMIT_KEY]: { date: today, count: count + 1 } });
    } else {
      await chrome.storage.local.set({ [RATE_LIMIT_KEY]: { date: today, count: 1 } });
    }
  } else {
    await chrome.storage.local.set({ [RATE_LIMIT_KEY]: { date: today, count: 1 } });
  }
  return true;
}

async function getRemainingRequests(): Promise<number> {
  const today = new Date().toDateString();
  const result = await chrome.storage.local.get(RATE_LIMIT_KEY);
  if (result[RATE_LIMIT_KEY]) {
    const { date, count } = result[RATE_LIMIT_KEY];
    if (date === today) return Math.max(0, DAILY_LIMIT - count);
  }
  return DAILY_LIMIT;
}

// ============================================================
// API CALLS
// ============================================================

// Tier 1: Quick scan — just traffic light + one-liner
async function quickScanAPI(text: string, author: string): Promise<QuickResult> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author, depth: 'quick' })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Quick scan failed');

  // If backend returned a cached deep result, extract quick info from it
  if (data.quickResult) return data.quickResult;
  if (data.analysis) {
    return {
      overall: data.analysis.overall,
      summary: data.analysis.summary.substring(0, 80),
      confidence: data.analysis.confidence
    };
  }

  throw new Error('No result returned');
}

// Tier 2: Deep analysis — full pipeline
async function deepAnalyzeAPI(
  text: string,
  author: string,
  hasVideo: boolean = false,
  videoDescription: string = '',
  videoThumbnailUrl: string = '',
  imageUrls: string[] = [],
  comments: string[] = []
): Promise<AnalysisResult> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls, comments, depth: 'deep' })
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Deep analysis failed');
  return data.analysis;
}

// ============================================================
// MESSAGE HANDLERS
// ============================================================

// Quick scan for initial badge
async function handleQuickScan(
  postId: string,
  text: string,
  author: string
): Promise<{ quickResult: QuickResult | null; error?: string; cached?: boolean }> {
  try {
    // Check if we already have a deep analysis cached
    const cached = await getCachedAnalysis(text);
    if (cached) {
      return {
        quickResult: { overall: cached.overall, summary: cached.summary.substring(0, 80), confidence: cached.confidence },
        cached: true
      };
    }

    const allowed = await checkRateLimit();
    if (!allowed) {
      return { quickResult: null, error: 'Daily limit reached. Upgrade to Pro for unlimited.' };
    }

    const quickResult = await quickScanAPI(text, author);
    return { quickResult, cached: false };
  } catch (error) {
    console.error('[Inkline] Quick scan error:', error);
    return { quickResult: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Deep analysis on hover
async function handleDeepAnalysis(
  postId: string,
  text: string,
  author: string,
  hasVideo: boolean,
  videoDescription: string,
  videoThumbnailUrl: string,
  imageUrls: string[],
  comments: string[] = []
): Promise<{ analysis: AnalysisResult | null; error?: string; cached?: boolean }> {
  try {
    // Check cache — but skip if we have comments and cached result lacks commentAnalysis
    const cached = await getCachedAnalysis(text);
    if (cached) {
      const hasCommentData = cached.commentAnalysis && cached.commentAnalysis.overallTone;
      if (comments.length === 0 || hasCommentData) {
        return { analysis: cached, cached: true };
      }
      // We have comments now but cached result doesn't have comment analysis — re-analyze
      console.log('[Inkline] Cache hit but missing commentAnalysis, re-analyzing with comments');
    }

    // No rate limit check for deep — it was already counted during quick scan
    const analysis = await deepAnalyzeAPI(text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls, comments);
    await cacheAnalysis(text, analysis);
    return { analysis, cached: false };
  } catch (error) {
    console.error('[Inkline] Deep analysis error:', error);
    return { analysis: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================
// MESSAGE LISTENER
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Tier 1: Quick scan (automatic, on post detection)
  if (message.type === 'QUICK_SCAN') {
    const { postId, text, author } = message.payload;
    handleQuickScan(postId, text, author).then(result => {
      sendResponse({ type: 'QUICK_RESULT', payload: { postId, ...result } });
    });
    return true;
  }

  // Tier 2: Deep analysis (triggered on hover)
  if (message.type === 'DEEP_ANALYZE') {
    const { postId, text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls, comments } = message.payload;
    handleDeepAnalysis(postId, text, author, hasVideo || false, videoDescription || '', videoThumbnailUrl || '', imageUrls || [], comments || [])
      .then(result => {
        sendResponse({ type: 'ANALYSIS_RESULT', payload: { postId, ...result } });
      });
    return true;
  }

  // Legacy: full analysis in one step (backward compat)
  if (message.type === 'ANALYZE_POST') {
    const { tweetId, text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls } = message.payload;
    handleDeepAnalysis(tweetId, text, author, hasVideo || false, videoDescription || '', videoThumbnailUrl || '', imageUrls || [])
      .then(result => {
        sendResponse({ type: 'ANALYSIS_RESULT', payload: { tweetId, ...result } });
      });
    return true;
  }

  if (message.type === 'GET_REMAINING') {
    getRemainingRequests().then(remaining => {
      sendResponse({ remaining });
    });
    return true;
  }
});

console.log('[Inkline] Background service worker started');
