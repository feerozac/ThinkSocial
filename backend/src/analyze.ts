// Inkline - Two-Tier Analysis Pipeline
// Tier 1 (quick): DeepSeek-only traffic light — ~$0.0005/call
// Tier 2 (deep):  Tavily + Qwen VL (parallel) → single DeepSeek call (analysis + relevance filtering)

import OpenAI from 'openai';
import { AnalysisResult, QuickResult, CounterSource } from './types';
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

// ============================================================
// TIER 1 — QUICK SCAN (traffic light only, no web search)
// Cost: ~$0.0005 per call (~300 input tokens, ~80 output tokens)
// ============================================================

const QUICK_SYSTEM_PROMPT = `You are a media analysis assistant. Quickly assess a social media post and return a traffic light rating.

Rules:
- green: Appears balanced, factual, well-sourced, neutral tone
- amber: Some bias, unverified claims, emotional framing, or missing context
- red: Strong bias, likely misinformation, heavy emotional manipulation, or anonymous/unreliable source

IMPORTANT: You are NOT determining truth. You are providing a quick signal. Use hedged language.

Respond with JSON only: { "overall": "green|amber|red", "summary": "One sentence (max 20 words)", "confidence": 0.0-1.0 }`;

export async function quickScan(text: string, author: string = 'Unknown'): Promise<QuickResult> {
  try {
    const response = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: QUICK_SYSTEM_PROMPT },
        { role: 'user', content: `Author: ${author}\nPost: ${text.substring(0, 500)}` }
      ],
      max_tokens: 100,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    let cleanJson = content.trim();
    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) cleanJson = jsonMatch[1];

    const result = JSON.parse(cleanJson);
    const validRatings = ['green', 'amber', 'red'];

    return {
      overall: validRatings.includes(result.overall) ? result.overall : 'amber',
      summary: typeof result.summary === 'string' ? result.summary : 'Unable to assess quickly',
      confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5
    };
  } catch (error) {
    console.error('[Inkline] Quick scan error:', error);
    return { overall: 'amber', summary: 'Quick assessment unavailable', confidence: 0.3 };
  }
}

// ============================================================
// TIER 2 — DEEP ANALYSIS
// Pipeline: Tavily + Qwen VL (parallel) → ONE DeepSeek call
// DeepSeek does analysis + relevance filtering in a single pass
// ============================================================

const DEEP_SYSTEM_PROMPT = `You are a media analysis assistant for Inkline. You analyze social media posts and provide objective assessments.

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

WEB ARTICLES & RELEVANCE FILTERING:
If web search results are provided, you MUST:
1. JUDGE RELEVANCE: For each article, decide if it genuinely covers the SAME topic as the post. Irrelevant articles (keyword overlap but different story) should be excluded.
2. LABEL STANCE: For each relevant article, classify it as "supporting" (agrees with the post's framing), "counter" (offers an opposing viewpoint), or "neutral" (factual/balanced reporting).
3. Return "relevantArticles" as an array of objects: [{ "index": 0, "stance": "counter" }, ...]. Only include relevant articles.

COUNTER-PERSPECTIVE:
If the post shows any bias, ideological lean, or one-sided framing (i.e. perspective is amber or red), you MUST provide a "counterPerspective" field:
- A 2-3 sentence articulation of a thoughtful alternative viewpoint that balances the post's perspective
- This should be a genuine steel-man argument, not a strawman
- Use phrases like "An alternative view holds that...", "Others might argue...", "From a different perspective..."
- If the post is balanced/green, set counterPerspective to null

COMMENT SECTION ANALYSIS:
If comments/replies from the post are provided, analyze them to produce a "commentAnalysis" object:
- "overallTone": A brief description of the general emotional tone (e.g. "Predominantly critical", "Supportive with some dissent", "Heated and polarised")
- "leaningSummary": 1-2 sentences on the ideological or topical lean of the comment section. Do commenters mostly agree with the post, or push back?
- "agreementLevel": One of: "echo-chamber" (near-unanimous agreement), "mostly-agree", "mixed", "mostly-disagree", "polarised" (strong opposing camps)
- "highlights": An array of 2-4 notable comments worth highlighting. Pick comments that:
  * Offer factual counter-evidence to the post's claims
  * Provide important context the post omitted
  * Represent a significant minority viewpoint
  * Are particularly insightful or well-reasoned
  Each highlight: { "author": "username", "text": "the comment (truncated if long)", "reason": "why it's notable", "sentiment": "agree|disagree|nuanced|neutral" }
If no comments are provided, set commentAnalysis to null.

VIDEO / IMAGE CONTEXT:
If visual analysis is provided (from our vision AI), factor it heavily into your assessment.
Include your assessment of the visual content in the videoAnalysis field.

Always respond with valid JSON matching the required schema.`;

const DEEP_USER_PROMPT = `Analyze this social media post and provide a brief, helpful summary that empowers the reader to understand the content better.

Author: {{AUTHOR}}
Content: {{CONTENT}}
{{VISUAL_CONTEXT}}
{{WEB_CONTEXT}}
{{COMMENT_CONTEXT}}

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
  "counterPerspective": "2-3 sentences offering a thoughtful alternative viewpoint (or null if post is balanced/green)",
  "relevantArticles": [{ "index": 0, "stance": "counter" }, { "index": 2, "stance": "supporting" }],
  "counterSources": [],
  "commentAnalysis": {
    "overallTone": "Brief description of comment section tone",
    "leaningSummary": "1-2 sentences on ideological lean of comments",
    "agreementLevel": "echo-chamber|mostly-agree|mixed|mostly-disagree|polarised",
    "highlights": [
      { "author": "username", "text": "Notable comment text", "reason": "Why it's worth reading", "sentiment": "agree|disagree|nuanced|neutral" }
    ]
  },
  "videoAnalysis": "Assessment of visual content and how it relates to the text (or null if no visuals)",
  "hasVideo": true|false
}`;

// ============================================================
// VALIDATION
// ============================================================

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
  if (!Array.isArray(obj.counterSources)) {
    obj.counterSources = [];
  }

  return true;
}

function searchResultsToCounterSources(results: SearchResult[]): CounterSource[] {
  return results
    .filter(r => r.url && r.title)
    .map(r => ({
      outlet: r.source,
      lean: '',
      headline: r.title,
      url: r.url,
      snippet: r.content,
      isReal: true
    }));
}

// ============================================================
// DEEP ANALYSIS — full pipeline (called on hover)
// Only 2 sequential stages: parallel fetch → single DeepSeek call
// ============================================================

export async function analyzePost(
  text: string,
  author: string = 'Unknown',
  hasVideo: boolean = false,
  videoDescription: string = '',
  videoThumbnailUrl: string = '',
  imageUrls: string[] = [],
  comments: string[] = []
): Promise<AnalysisResult> {

  const hasVisuals = hasVideo || imageUrls.length > 0;
  const isSubstantive = text.length > 60;

  // === STEP 1: Run vision + web search IN PARALLEL ===
  const [visionDescription, searchResults] = await Promise.all([
    // Vision analysis (Qwen VL)
    (async () => {
      if (!hasVisuals || !isVisionAvailable()) return '';
      try {
        if (videoThumbnailUrl) {
          console.log('[Inkline] Deep: routing to Qwen VL for video');
          return await analyzeImage(videoThumbnailUrl, text, author);
        } else if (imageUrls.length > 0) {
          console.log('[Inkline] Deep: routing to Qwen VL for images');
          return await analyzeMultipleImages(imageUrls, text, author);
        }
      } catch (err) {
        console.error('[Inkline] Vision analysis failed:', err);
      }
      return '';
    })(),

    // Web search (Tavily)
    (async () => {
      if (!isSearchAvailable() || !isSubstantive) {
        if (!isSubstantive) console.log('[Inkline] Deep: skipping web search — post too short');
        return [] as SearchResult[];
      }
      try {
        const query = buildSearchQuery(text, author);
        console.log('[Inkline] Deep: searching web for:', query.substring(0, 80) + '...');
        return await searchTopic(query, 5);
      } catch (err) {
        console.error('[Inkline] Web search failed:', err);
        return [] as SearchResult[];
      }
    })()
  ]);

  // === STEP 2: Build context strings ===
  let visualContext = '';
  if (hasVisuals) {
    visualContext = '\n--- VISUAL CONTENT ---';
    if (hasVideo) visualContext += '\nThis post contains video.';
    if (imageUrls.length > 0) visualContext += `\nThis post contains ${imageUrls.length} image(s).`;
    if (visionDescription) {
      visualContext += `\n\nVISION AI ANALYSIS (from Qwen VL):\n${visionDescription}`;
    } else if (videoDescription) {
      visualContext += `\nAccessible description: ${videoDescription}`;
    } else {
      visualContext += '\nVisual content could not be directly analyzed.';
    }
    visualContext += '\n--- END VISUAL CONTENT ---';
  }

  let webContext = '';
  if (searchResults.length > 0) {
    webContext = '\n--- WEB SEARCH RESULTS (may include irrelevant articles — you must judge relevance) ---';
    webContext += '\nThe following articles were found via web search. Judge each for relevance to the post:';
    searchResults.forEach((r, i) => {
      webContext += `\n\n[${i}] "${r.title}" (${r.source})`;
      if (r.content) webContext += `\n    Excerpt: ${r.content}`;
    });
    webContext += '\n--- END WEB SEARCH ---';
    webContext += '\n\nFor each article, decide if it is genuinely about the SAME topic as the post. Only reference relevant articles in your analysis. Return the relevant indices in "relevantArticleIndices".';
  }

  // Comment context
  let commentContext = '';
  if (comments.length > 0) {
    // Take up to 20 comments, truncated to keep tokens reasonable
    const trimmedComments = comments.slice(0, 20).map((c, i) =>
      `[${i + 1}] ${c.substring(0, 200)}`
    );
    commentContext = '\n--- COMMENTS / REPLIES ---';
    commentContext += `\n${comments.length} visible comments. Here are the first ${trimmedComments.length}:`;
    commentContext += '\n' + trimmedComments.join('\n');
    commentContext += '\n--- END COMMENTS ---';
    commentContext += '\n\nAnalyze the tone, lean, and agreement level of these comments. Highlight 2-4 notable ones.';
  }

  // === STEP 3: Single DeepSeek call — analysis + relevance filtering combined ===
  const userPrompt = DEEP_USER_PROMPT
    .replace('{{AUTHOR}}', author)
    .replace('{{CONTENT}}', text)
    .replace('{{VISUAL_CONTEXT}}', visualContext)
    .replace('{{WEB_CONTEXT}}', webContext)
    .replace('{{COMMENT_CONTEXT}}', commentContext);

  try {
    const response = await getClient().chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: DEEP_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from DeepSeek');

    let cleanJson = content.trim();
    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) cleanJson = jsonMatch[1];

    const analysis = JSON.parse(cleanJson);

    if (!validateAnalysisResult(analysis)) {
      throw new Error('Invalid analysis structure from DeepSeek');
    }

    // Build counter-sources from articles DeepSeek judged relevant, with stance labels
    const raw = analysis as unknown as Record<string, unknown>;
    if (searchResults.length > 0) {
      const relevantArticles = Array.isArray(raw.relevantArticles) ? raw.relevantArticles as Array<{ index: number; stance?: string }> : [];

      if (relevantArticles.length > 0) {
        analysis.counterSources = relevantArticles
          .filter(a => typeof a.index === 'number' && a.index >= 0 && a.index < searchResults.length)
          .map(a => {
            const r = searchResults[a.index];
            return {
              outlet: r.source,
              lean: '',
              headline: r.title,
              url: r.url,
              snippet: r.content,
              stance: a.stance || 'neutral',
              isReal: true
            };
          });
        console.log(`[Inkline] Relevance: ${analysis.counterSources.length}/${searchResults.length} articles kept`);
      } else {
        // Fallback: include all if DeepSeek didn't return the array
        analysis.counterSources = searchResultsToCounterSources(searchResults);
        console.log(`[Inkline] Relevance: no article judgments returned, keeping all ${searchResults.length}`);
      }
    }

    // Clean up internal fields
    delete raw.relevantArticles;

    // Carry counterPerspective through (already on type)
    if (typeof raw.counterPerspective === 'string' && raw.counterPerspective.length > 0) {
      analysis.counterPerspective = raw.counterPerspective as string;
    }

    // Carry commentAnalysis through
    if (raw.commentAnalysis && typeof raw.commentAnalysis === 'object') {
      analysis.commentAnalysis = raw.commentAnalysis as AnalysisResult['commentAnalysis'];
    }

    if (hasVideo) analysis.hasVideo = true;
    if (visionDescription && !analysis.videoAnalysis) {
      analysis.videoAnalysis = visionDescription;
    }

    return analysis;
  } catch (error) {
    console.error('[Inkline] Deep analysis error:', error);

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
