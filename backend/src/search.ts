// Inkline - Web Search for Real-Time Counter-Sources
// Uses Tavily Search API to find real articles on the same topic

export interface SearchResult {
  title: string;
  url: string;
  content: string;   // snippet
  source: string;    // domain name
  score: number;     // relevance score
}

/**
 * Search the web for articles related to a tweet's topic
 * Returns up to `maxResults` relevant articles
 */
export async function searchTopic(
  query: string,
  maxResults: number = 5
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.log('[Inkline] No TAVILY_API_KEY configured, skipping web search');
    return [];
  }

  try {
    console.log('[Inkline] Tavily: searching for related articles...');

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
        include_domains: [],      // no filter — get diverse sources
        exclude_domains: [
          'twitter.com', 'x.com',       // exclude the platform itself
          'reddit.com',                   // exclude social aggregators
          'facebook.com', 'instagram.com'
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Tavily API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as { results?: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
    }> };

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    const results: SearchResult[] = data.results.map(r => ({
      title: r.title || '',
      url: r.url || '',
      content: (r.content || '').substring(0, 200),
      source: extractDomain(r.url || ''),
      score: r.score || 0
    }));

    console.log(`[Inkline] Tavily: found ${results.length} articles`);
    return results;
  } catch (error) {
    console.error('[Inkline] Tavily search error:', error);
    return [];
  }
}

/**
 * Build a search query from tweet text
 * Strips mentions, URLs, hashtags and takes the core claim
 */
export function buildSearchQuery(tweetText: string, author: string = ''): string {
  let query = tweetText
    .replace(/https?:\/\/\S+/g, '')          // remove URLs
    .replace(/@\w+/g, '')                     // remove mentions
    .replace(/#(\w+)/g, '$1')                 // keep hashtag text but remove #
    .replace(/\s+/g, ' ')                     // normalize whitespace
    .trim();

  // Truncate to a reasonable search length
  if (query.length > 200) {
    query = query.substring(0, 200);
  }

  // If too short after cleaning, use original
  if (query.length < 15) {
    query = tweetText.substring(0, 200);
  }

  return query;
}

/**
 * Extract domain name from URL for display
 */
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Check if web search is configured
 */
export function isSearchAvailable(): boolean {
  return !!(process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.length > 5);
}
