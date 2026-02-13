// Inkline - Multi-Model Analysis Pipeline
// 1. Qwen VL for visual understanding (images/video)
// 2. Tavily for real-time web search (counter-sources)
// 3. DeepSeek for structured analysis (merges everything)

import OpenAI from 'openai';
import { AnalysisResult, CounterSource } from './types';
import { analyzeImage, analyzeMultipleImages, isVisionAvailable } from './vision';
import { searchTopic, buildSearchQuery, isSearchAvailable, SearchResult } from './search';

// Lazy-initialize DeepSeek client (after dotenv has loaded)
let _deepseek: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_deepseek) {
    _deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: 'https://api.deepseek.com'
    });
  }
  return _deepseek;
}

// System prompt for consistent analysis
const SYSTEM_PROMPT = `You are a media analysis assistant for Inkline. You analyze social media posts and provide objective assessments.

IMPORTANT: You are NOT determining truth or falsehood. You provide contextual analysis to support the reader's own judgement. Use measured, scholarly language. Never claim certainty. Frame findings as observations, not verdicts. Phrases like "appears to", "suggests", "may indicate" are preferred over definitive statements.

Analyze across these 5 dimensions:

1. PERSPECTIVE: What political/ideological lean does this content show?
   - green: Center/balanced, multiple viewpoints acknowledged
   - amber: Leans left or right of center, but not extreme
   - red: Strong ideological framing, one-sided presentation

2. VERIFICATION: Can the key claims be verified?
   - green: Key claims align with widely reported facts
   - amber: Claims are unverified or developing story
   - red: Claims conflict with established reporting

3. BALANCE: Are multiple perspectives represented?
   - green: Shows multiple sides of the issue
   - amber: Limited perspectives, some context missing
   - red: Only one viewpoint, ignores counterarguments

4. SOURCE: What's the credibility of the source/author?
   - green: Established outlet or verified expert
   - amber: Mixed track record or unknown source
   - red: History of inaccuracy or anonymous/unverifiable

5. TONE: Is emotional manipulation present?
   - green: Neutral, factual presentation
   - amber: Some emotional framing or sensationalism
   - red: Heavy emotional manipulation, outrage bait

REAL-TIME WEB ARTICLES:
If web search results are provided below, use them to:
- Cross-reference claims in the tweet against what real news outlets are reporting
- Assess whether the tweet's framing matches or departs from mainstream reporting
- Improve your VERIFICATION rating with actual evidence
- Factor the web context into your summary

COUNTER-SOURCES:
You do NOT need to generate counter-sources yourself. Real articles from web search will be attached separately. Set counterSources to an empty array [].

VIDEO / IMAGE CONTEXT:
If visual analysis is provided (from our vision AI), factor it heavily into your assessment. The visual analysis describes what was actually seen in the image or video thumbnail. Use it to assess whether:
- The visual supports the text claims or tells a different story
- The imagery appears authentic, manipulated, or taken out of context
- Emotional imagery is being used to manipulate the viewer
Include your assessment of the visual content in the videoAnalysis field.

Always respond with valid JSON matching the required schema.`;

// User prompt template
const USER_PROMPT_TEMPLATE = `Analyze this social media post and provide a brief, helpful summary that empowers the reader to understand the content better.

Author: {{AUTHOR}}
Content: {{CONTENT}}
{{VISUAL_CONTEXT}}
{{WEB_CONTEXT}}

Respond with JSON in this exact format:
{
  "overall": "green" | "amber" | "red",
  "perspective": { "rating": "green|amber|red", "label": "Brief description (max 30 chars)" },
  "verification": { "rating": "green|amber|red", "label": "Brief description" },
  "balance": { "rating": "green|amber|red", "label": "Brief description" },
  "source": { "rating": "green|amber|red", "label": "Brief description" },
  "tone": { "rating": "green|amber|red", "label": "Brief description" },
  "summary": "2-3 measured sentences providing context. Use hedged language ('appears to', 'suggests', 'may'). Reference specific web sources if available. Never claim something is true or false.",
  "confidence": 0.0-1.0,
  "counterSources": [],
  "videoAnalysis": "Assessment of visual content and how it relates to the text (or null if no visuals)",
  "hasVideo": true|false
}`;

// Validate the analysis result structure
function validateAnalysisResult(data: unknown): data is AnalysisResult {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  
  const validRatings = ['green', 'amber', 'red'];
  
  if (!validRatings.includes(obj.overall as string)) return false;
  
  const dimensions = ['perspective', 'verification', 'balance', 'source', 'tone'];
  for (const dim of dimensions) {
    const d = obj[dim] as Record<string, unknown> | undefined;
    if (!d || typeof d !== 'object') return false;
    if (!validRatings.includes(d.rating as string)) return false;
    if (typeof d.label !== 'string') return false;
  }
  
  if (typeof obj.summary !== 'string') return false;
  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
    obj.confidence = 0.7;
  }

  // Ensure counterSources is an array (or default to empty)
  if (!Array.isArray(obj.counterSources)) {
    obj.counterSources = [];
  }
  
  return true;
}

/**
 * Convert Tavily search results into CounterSource objects with real URLs
 */
function searchResultsToCounterSources(results: SearchResult[]): CounterSource[] {
  return results
    .filter(r => r.url && r.title)
    .map(r => ({
      outlet: r.source,
      lean: '',  // We don't know the lean — DeepSeek will assess this
      headline: r.title,
      url: r.url,
      snippet: r.content,
      isReal: true
    }));
}

// Main analysis function
export async function analyzePost(
  text: string,
  author: string = 'Unknown',
  hasVideo: boolean = false,
  videoDescription: string = '',
  videoThumbnailUrl: string = '',
  imageUrls: string[] = []
): Promise<AnalysisResult> {
  
  const hasVisuals = hasVideo || imageUrls.length > 0;

  // === COST OPTIMIZATION ===
  // Per-analysis cost estimates (approximate):
  //   DeepSeek chat:  ~$0.002 (always runs — ~1K input, 500 output tokens)
  //   Qwen VL:        ~$0.008 (only if visuals detected)
  //   Tavily search:  ~$0.005 (only if text is substantive enough)
  // 
  // Text-only tweet:  ~$0.007  (DeepSeek + Tavily)
  // Visual tweet:     ~$0.015  (DeepSeek + Qwen + Tavily)
  // Short/simple:     ~$0.002  (DeepSeek only)
  //
  // At 50 free analyses/day × 1000 users = 50K calls/day
  // Optimistic mix (70% text, 20% visual, 10% simple):
  //   50K × ($0.007×0.7 + $0.015×0.2 + $0.002×0.1) = ~$405/day = ~$12K/month

  // Skip web search for very short or simple tweets (saves ~$0.005/call)
  const isSubstantive = text.length > 60;

  // === STEP 1: Run vision + web search IN PARALLEL ===
  const [visionDescription, searchResults] = await Promise.all([
    // Vision analysis (Qwen VL) — only if visuals detected
    (async () => {
      if (!hasVisuals || !isVisionAvailable()) return '';
      try {
        if (videoThumbnailUrl) {
          console.log('[Inkline] Routing to Qwen VL for video thumbnail analysis');
          return await analyzeImage(videoThumbnailUrl, text, author);
        } else if (imageUrls.length > 0) {
          console.log('[Inkline] Routing to Qwen VL for image analysis');
          return await analyzeMultipleImages(imageUrls, text, author);
        }
      } catch (err) {
        console.error('[Inkline] Vision analysis failed:', err);
      }
      return '';
    })(),
    
    // Web search (Tavily) — only for substantive tweets
    (async () => {
      if (!isSearchAvailable() || !isSubstantive) {
        if (!isSubstantive) console.log('[Inkline] Skipping web search — tweet too short for meaningful search');
        return [] as SearchResult[];
      }
      try {
        const query = buildSearchQuery(text, author);
        console.log('[Inkline] Searching web for:', query.substring(0, 80) + '...');
        return await searchTopic(query, 5);
      } catch (err) {
        console.error('[Inkline] Web search failed:', err);
        return [] as SearchResult[];
      }
    })()
  ]);

  // === STEP 2: Build context strings for DeepSeek ===
  
  // Visual context
  let visualContext = '';
  if (hasVisuals) {
    visualContext = '\n--- VISUAL CONTENT ---';
    if (hasVideo) visualContext += '\nThis post contains video.';
    if (imageUrls.length > 0) visualContext += `\nThis post contains ${imageUrls.length} image(s).`;
    if (visionDescription) {
      visualContext += `\n\nVISION AI ANALYSIS (from Qwen VL - this AI actually viewed the image/video):\n${visionDescription}`;
    } else if (videoDescription) {
      visualContext += `\nAccessible description: ${videoDescription}`;
    } else {
      visualContext += '\nVisual content could not be directly analyzed.';
    }
    visualContext += '\n--- END VISUAL CONTENT ---';
  }

  // Web search context
  let webContext = '';
  if (searchResults.length > 0) {
    webContext = '\n--- REAL-TIME WEB SEARCH RESULTS ---';
    webContext += '\nThe following are REAL articles found on the web about this topic:';
    searchResults.forEach((r, i) => {
      webContext += `\n\n[${i + 1}] "${r.title}" (${r.source})`;
      if (r.content) webContext += `\n    Excerpt: ${r.content}`;
    });
    webContext += '\n--- END WEB SEARCH ---';
    webContext += '\n\nUse these articles to cross-reference the claims in the tweet. Are the claims supported, contradicted, or uncovered by mainstream reporting?';
  }

  // === STEP 3: Structured analysis with DeepSeek ===
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{AUTHOR}}', author)
    .replace('{{CONTENT}}', text)
    .replace('{{VISUAL_CONTEXT}}', visualContext)
    .replace('{{WEB_CONTEXT}}', webContext);
  
  try {
    const response = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from DeepSeek');
    
    // Parse JSON
    const jsonText = content.trim();
    let cleanJson = jsonText;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) cleanJson = jsonMatch[1];
    
    const analysis = JSON.parse(cleanJson);
    
    if (!validateAnalysisResult(analysis)) {
      throw new Error('Invalid analysis structure from DeepSeek');
    }

    // === STEP 4: Attach real counter-sources from web search ===
    if (searchResults.length > 0) {
      analysis.counterSources = searchResultsToCounterSources(searchResults);
    }

    // Mark video/visual presence
    if (hasVideo) analysis.hasVideo = true;
    if (visionDescription && !analysis.videoAnalysis) {
      analysis.videoAnalysis = visionDescription;
    }
    
    return analysis;
  } catch (error) {
    console.error('[Inkline] Analysis error:', error);
    
    return {
      overall: 'amber',
      perspective: { rating: 'amber', label: 'Unable to determine' },
      verification: { rating: 'amber', label: 'Unable to verify' },
      balance: { rating: 'amber', label: 'Unable to assess' },
      source: { rating: 'amber', label: 'Unknown source' },
      tone: { rating: 'amber', label: 'Unable to assess' },
      summary: 'We were unable to fully analyze this post. Please use your own judgment.',
      confidence: 0.3,
      counterSources: searchResults.length > 0 ? searchResultsToCounterSources(searchResults) : [],
      hasVideo,
      videoAnalysis: visionDescription || undefined,
    };
  }
}
