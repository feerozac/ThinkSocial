// Think Social - Background Service Worker
// Handles API communication and caching

interface CounterSource {
  outlet: string;
  lean: string;
  headline: string;
  url: string;
  snippet?: string;
  isReal: boolean;
}

interface AnalysisResult {
  overall: 'green' | 'amber' | 'red';
  perspective: { rating: 'green' | 'amber' | 'red'; label: string };
  verification: { rating: 'green' | 'amber' | 'red'; label: string };
  balance: { rating: 'green' | 'amber' | 'red'; label: string };
  source: { rating: 'green' | 'amber' | 'red'; label: string };
  tone: { rating: 'green' | 'amber' | 'red'; label: string };
  summary: string;
  confidence: number;
  counterSources?: CounterSource[];
  videoAnalysis?: string;
  hasVideo?: boolean;
}

interface CacheEntry {
  analysis: AnalysisResult;
  timestamp: number;
}

// API endpoint - update this when deployed
const API_URL = 'http://localhost:3001/api/analyze';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
const RATE_LIMIT_KEY = 'think_social_daily_count';
const DAILY_LIMIT = 50;

// Simple hash function for cache keys
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'ts_' + Math.abs(hash).toString(36);
}

// Get cached analysis from local storage
async function getCachedAnalysis(text: string): Promise<AnalysisResult | null> {
  const key = hashText(text);
  const result = await chrome.storage.local.get(key);
  
  if (result[key]) {
    const entry: CacheEntry = result[key];
    const age = Date.now() - entry.timestamp;
    
    if (age < CACHE_TTL) {
      console.log('[Inkline] Cache hit for', key);
      return entry.analysis;
    } else {
      // Cache expired, remove it
      await chrome.storage.local.remove(key);
    }
  }
  
  return null;
}

// Save analysis to local cache
async function cacheAnalysis(text: string, analysis: AnalysisResult): Promise<void> {
  const key = hashText(text);
  const entry: CacheEntry = {
    analysis,
    timestamp: Date.now()
  };
  
  await chrome.storage.local.set({ [key]: entry });
  console.log('[Inkline] Cached analysis for', key);
}

// Check and update rate limit
async function checkRateLimit(): Promise<boolean> {
  const today = new Date().toDateString();
  const result = await chrome.storage.local.get(RATE_LIMIT_KEY);
  
  if (result[RATE_LIMIT_KEY]) {
    const { date, count } = result[RATE_LIMIT_KEY];
    
    if (date === today) {
      if (count >= DAILY_LIMIT) {
        return false; // Rate limited
      }
      // Increment count
      await chrome.storage.local.set({
        [RATE_LIMIT_KEY]: { date: today, count: count + 1 }
      });
    } else {
      // New day, reset counter
      await chrome.storage.local.set({
        [RATE_LIMIT_KEY]: { date: today, count: 1 }
      });
    }
  } else {
    // First request ever
    await chrome.storage.local.set({
      [RATE_LIMIT_KEY]: { date: today, count: 1 }
    });
  }
  
  return true;
}

// Get remaining daily requests
async function getRemainingRequests(): Promise<number> {
  const today = new Date().toDateString();
  const result = await chrome.storage.local.get(RATE_LIMIT_KEY);
  
  if (result[RATE_LIMIT_KEY]) {
    const { date, count } = result[RATE_LIMIT_KEY];
    if (date === today) {
      return Math.max(0, DAILY_LIMIT - count);
    }
  }
  
  return DAILY_LIMIT;
}

// Call the backend API
async function analyzeWithAPI(
  text: string,
  author: string,
  hasVideo: boolean = false,
  videoDescription: string = '',
  videoThumbnailUrl: string = '',
  imageUrls: string[] = []
): Promise<AnalysisResult> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }
  
  return data.analysis;
}

// Main analysis function
async function analyzePost(
  tweetId: string,
  text: string,
  author: string,
  hasVideo: boolean = false,
  videoDescription: string = '',
  videoThumbnailUrl: string = '',
  imageUrls: string[] = []
): Promise<{ analysis: AnalysisResult | null; error?: string; cached?: boolean }> {
  try {
    // Check cache first
    const cached = await getCachedAnalysis(text);
    if (cached) {
      return { analysis: cached, cached: true };
    }
    
    // Check rate limit
    const allowed = await checkRateLimit();
    if (!allowed) {
      return { 
        analysis: null, 
        error: 'Daily limit reached (50 posts). Upgrade to Pro for unlimited analysis.' 
      };
    }
    
    // Call API
    const analysis = await analyzeWithAPI(text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls);
    
    // Cache the result
    await cacheAnalysis(text, analysis);
    
    return { analysis, cached: false };
  } catch (error) {
    console.error('[Inkline] Analysis error:', error);
    return { 
      analysis: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_POST') {
    const { tweetId, text, author, hasVideo, videoDescription, videoThumbnailUrl, imageUrls } = message.payload;
    
    analyzePost(tweetId, text, author, hasVideo || false, videoDescription || '', videoThumbnailUrl || '', imageUrls || [])
      .then(result => {
        sendResponse({
          type: 'ANALYSIS_RESULT',
          payload: {
            tweetId,
            ...result
          }
        });
      });
    
    // Return true to indicate async response
    return true;
  }
  
  if (message.type === 'GET_REMAINING') {
    getRemainingRequests().then(remaining => {
      sendResponse({ remaining });
    });
    return true;
  }
});

// Log when service worker starts
console.log('[Inkline] Background service worker started');
