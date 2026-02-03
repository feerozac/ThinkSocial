// Think Social - DeepSeek API Integration for Post Analysis

import OpenAI from 'openai';
import { AnalysisResult } from './types';

// Initialize DeepSeek client (OpenAI-compatible API)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1'
});

// System prompt for consistent analysis
const SYSTEM_PROMPT = `You are a media analysis assistant for Think Social. You analyze social media posts and provide objective assessments.

IMPORTANT: You are NOT judging truth or falsehood. You are helping users understand what's behind the content - the perspective, the sources, the balance. Use humble, non-judgmental language.

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

Always respond with valid JSON matching the required schema.`;

// User prompt template
const USER_PROMPT_TEMPLATE = `Analyze this social media post and provide a brief, helpful summary that empowers the reader to understand the content better.

Author: {{AUTHOR}}
Content: {{CONTENT}}

Respond with JSON in this exact format:
{
  "overall": "green" | "amber" | "red",
  "perspective": { "rating": "green|amber|red", "label": "Brief description (max 30 chars)" },
  "verification": { "rating": "green|amber|red", "label": "Brief description" },
  "balance": { "rating": "green|amber|red", "label": "Brief description" },
  "source": { "rating": "green|amber|red", "label": "Brief description" },
  "tone": { "rating": "green|amber|red", "label": "Brief description" },
  "summary": "One or two sentences explaining the overall assessment",
  "confidence": 0.0-1.0
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
    // Default confidence if missing or invalid
    obj.confidence = 0.7;
  }
  
  return true;
}

// Main analysis function
export async function analyzePost(text: string, author: string = 'Unknown'): Promise<AnalysisResult> {
  // Build the user prompt
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{AUTHOR}}', author)
    .replace('{{CONTENT}}', text);
  
  try {
    // Call DeepSeek API
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    });
    
    // Extract the text response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from DeepSeek');
    }
    
    // Parse JSON from response
    const jsonText = content.trim();
    
    // Try to extract JSON if wrapped in markdown code blocks
    let cleanJson = jsonText;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1];
    }
    
    const analysis = JSON.parse(cleanJson);
    
    // Validate the structure
    if (!validateAnalysisResult(analysis)) {
      throw new Error('Invalid analysis structure from DeepSeek');
    }
    
    return analysis;
  } catch (error) {
    console.error('[Think Social] Analysis error:', error);
    
    // Return a fallback analysis for graceful degradation
    return {
      overall: 'amber',
      perspective: { rating: 'amber', label: 'Unable to determine' },
      verification: { rating: 'amber', label: 'Unable to verify' },
      balance: { rating: 'amber', label: 'Unable to assess' },
      source: { rating: 'amber', label: 'Unknown source' },
      tone: { rating: 'amber', label: 'Unable to assess' },
      summary: 'We were unable to fully analyze this post. Please use your own judgment.',
      confidence: 0.3
    };
  }
}
