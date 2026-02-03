// Think Social - Claude API Integration for Post Analysis

import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult } from './types';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// Analysis prompt - designed for consistent JSON output
const ANALYSIS_PROMPT = `You are a media analysis assistant for Think Social. Analyze the following social media post and provide an objective assessment.

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

Provide a brief, helpful summary that empowers the reader to understand the content better.

Return ONLY valid JSON in this exact format:
{
  "overall": "green" | "amber" | "red",
  "perspective": { "rating": "...", "label": "Brief description (max 30 chars)" },
  "verification": { "rating": "...", "label": "Brief description" },
  "balance": { "rating": "...", "label": "Brief description" },
  "source": { "rating": "...", "label": "Brief description" },
  "tone": { "rating": "...", "label": "Brief description" },
  "summary": "One or two sentences explaining the overall assessment",
  "confidence": 0.0-1.0
}

POST TO ANALYZE:
Author: {{AUTHOR}}
Content: {{CONTENT}}`;

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
  // Build the prompt
  const prompt = ANALYSIS_PROMPT
    .replace('{{AUTHOR}}', author)
    .replace('{{CONTENT}}', text);
  
  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    // Extract the text response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    // Parse JSON from response
    const jsonText = content.text.trim();
    
    // Try to extract JSON if wrapped in markdown code blocks
    let cleanJson = jsonText;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1];
    }
    
    const analysis = JSON.parse(cleanJson);
    
    // Validate the structure
    if (!validateAnalysisResult(analysis)) {
      throw new Error('Invalid analysis structure from Claude');
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
