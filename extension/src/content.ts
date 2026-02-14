// Inkline - Multi-Platform Content Script
// Supports: Twitter/X, Facebook, Instagram
// Two-tier analysis: quick scan on load, deep analysis on hover
// Detects posts and injects analysis badges with resilient selectors

interface CounterSource {
  outlet: string;
  lean: string;
  headline: string;
  url: string;
  snippet?: string;
  stance?: string;    // "supporting", "counter", or "neutral"
  isReal: boolean;
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

interface MediaInfo {
  hasVideo: boolean;
  videoDescription: string;
  videoThumbnailUrl: string;
  imageUrls: string[];
}

interface CommentAnalysis {
  overallTone: string;
  leaningSummary: string;
  highlights: Array<{ author: string; text: string; reason: string; sentiment: string }>;
  agreementLevel: string;
}

// Store post metadata so we can do deep analysis on hover without re-extracting
interface PostMeta {
  postId: string;
  text: string;
  author: string;
  media: MediaInfo;
  comments: string[];
  quickResult?: QuickResult;
  deepResult?: AnalysisResult;
  deepPending?: boolean;
}

type Platform = 'twitter' | 'facebook' | 'instagram' | 'unknown';

// ============================================================
// STATE
// ============================================================

const processedPosts = new Set<string>();
const pendingPosts = new Set<string>();
const postMetaMap = new Map<string, PostMeta>();
let activePanel: HTMLElement | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const COLORS = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444'
};

const RATING_LABELS = {
  green: 'Appears well-sourced',
  amber: 'Additional context may be helpful',
  red: 'Consider seeking further sources'
};

// ============================================================
// PLATFORM DETECTION
// ============================================================

function detectPlatform(): Platform {
  const host = window.location.hostname;
  if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
  if (host.includes('facebook.com')) return 'facebook';
  if (host.includes('instagram.com')) return 'instagram';
  return 'unknown';
}

const PLATFORM = detectPlatform();

// ============================================================
// SHARED SELECTOR UTILITIES
// ============================================================

function queryFirst(el: Element | Document, selectors: string[]): Element | null {
  for (const sel of selectors) {
    try {
      const result = el.querySelector(sel);
      if (result) return result;
    } catch { /* skip */ }
  }
  return null;
}

function queryAllFirst(el: Element | Document, selectorSets: string[]): Element[] {
  for (const sel of selectorSets) {
    try {
      const results = el.querySelectorAll(sel);
      if (results.length > 0) return Array.from(results);
    } catch { /* skip */ }
  }
  return [];
}

// ============================================================
// TWITTER/X EXTRACTORS
// ============================================================

function twitterFindPosts(): Element[] {
  let articles = document.querySelectorAll('article[data-testid="tweet"]');
  if (articles.length > 0) return Array.from(articles);
  
  const allArticles = Array.from(document.querySelectorAll('article'));
  const valid = allArticles.filter(a => 
    a.querySelector('time') && a.querySelector('a[href*="/status/"]')
  );
  if (valid.length > 0) return valid;

  const roleArticles = Array.from(document.querySelectorAll('[role="article"]'));
  return roleArticles.filter(a =>
    a.querySelector('time') && a.querySelector('a[href*="/status/"]')
  );
}

function twitterGetPostId(el: Element): string | null {
  const link = el.querySelector('a[href*="/status/"]');
  if (link) {
    const match = link.getAttribute('href')?.match(/\/status\/(\d+)/);
    if (match) return 'tw_' + match[1];
  }
  const timeEl = el.querySelector('time');
  if (timeEl) {
    const parent = timeEl.closest('a');
    const match = parent?.getAttribute('href')?.match(/\/status\/(\d+)/);
    if (match) return 'tw_' + match[1];
  }
  const allLinks = Array.from(el.querySelectorAll('a[href]'));
  for (const a of allLinks) {
    const match = (a.getAttribute('href') || '').match(/\/status\/(\d+)/);
    if (match) return 'tw_' + match[1];
  }
  return null;
}

function twitterGetText(el: Element): string {
  const textEl = queryFirst(el, [
    '[data-testid="tweetText"]',
    '[data-testid="tweet-text"]',
    '[data-testid="post-text"]',
    '[lang]'
  ]);
  if (textEl) return textEl.textContent || '';

  const candidates = Array.from(el.querySelectorAll('div[dir="auto"]'));
  let best = '';
  for (const c of candidates) {
    const t = c.textContent || '';
    if (t.length > best.length && t.length > 20) best = t;
  }
  return best;
}

function twitterGetAuthor(el: Element): string {
  const userEl = queryFirst(el, [
    '[data-testid="User-Name"]',
    '[data-testid="user-name"]',
    '[data-testid="author"]'
  ]);
  if (userEl) {
    const a = userEl.querySelector('a[href^="/"]');
    if (a) return (a.getAttribute('href') || '').replace('/', '') || 'unknown';
  }
  const links = Array.from(el.querySelectorAll('a[href^="/"]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (/^\/[a-zA-Z0-9_]{1,15}$/.test(href)) return href.replace('/', '');
  }
  return 'unknown';
}

function twitterDetectMedia(el: Element): MediaInfo {
  const result: MediaInfo = { hasVideo: false, videoDescription: '', videoThumbnailUrl: '', imageUrls: [] };

  // Video
  const videoPlayer = queryFirst(el, ['[data-testid="videoPlayer"]', '[data-testid="video-player"]']);
  if (videoPlayer) {
    result.hasVideo = true;
    const videoEl = videoPlayer.querySelector('video');
    result.videoDescription = videoPlayer.getAttribute('aria-label') || 'Video in tweet';
    if (videoEl?.getAttribute('poster')) result.videoThumbnailUrl = videoEl.getAttribute('poster')!;
  }
  if (!result.hasVideo) {
    const vid = el.querySelector('video');
    if (vid) {
      result.hasVideo = true;
      result.videoDescription = 'Video in tweet';
      if (vid.getAttribute('poster')) result.videoThumbnailUrl = vid.getAttribute('poster')!;
    }
  }

  // YouTube embed
  if (!result.hasVideo) {
    const ytLink = el.querySelector('a[href*="youtube.com"], a[href*="youtu.be"]');
    if (ytLink) {
      const href = ytLink.getAttribute('href') || '';
      const ytMatch = href.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
      if (ytMatch) {
        result.hasVideo = true;
        result.videoDescription = 'YouTube video';
        result.videoThumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
  }

  // Images
  const photos = queryAllFirst(el, [
    '[data-testid="tweetPhoto"] img',
    '[data-testid="tweet-photo"] img',
    'div[aria-label] img[src*="pbs.twimg.com/media"]'
  ]);
  for (const img of photos) {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.includes('emoji') && !src.includes('profile_images')) {
      let url = src;
      if (url.includes('pbs.twimg.com') && !url.includes('name=')) url += '?format=jpg&name=medium';
      result.imageUrls.push(url);
    }
  }

  return result;
}

// ============================================================
// FACEBOOK EXTRACTORS
// ============================================================

function facebookFindPosts(): Element[] {
  // Facebook posts use role="article" or are wrapped in specific feed containers
  // Strategy 1: role="article" elements that contain text and timestamps
  const articles = Array.from(document.querySelectorAll('[role="article"]'));
  const valid = articles.filter(a => {
    // Must have some text content (not just an ad or sidebar)
    const hasText = a.querySelector('div[dir="auto"]');
    // Must have a timestamp link (indicates it's a real post)
    const hasTime = a.querySelector('a[href*="/posts/"]') 
      || a.querySelector('a[href*="/photos/"]')
      || a.querySelector('a[href*="story_fbid"]')
      || a.querySelector('span[id] > a > span') // timestamp span pattern
      || a.querySelector('a[href*="permalink"]');
    // Ignore tiny elements (buttons, comment boxes)
    const isSubstantial = a.getBoundingClientRect().height > 100;
    return hasText && (hasTime || isSubstantial);
  });
  
  if (valid.length > 0) return valid;

  // Strategy 2: feed story containers
  const feedItems = Array.from(document.querySelectorAll('[data-ad-comet-preview], [data-pagelet*="FeedUnit"]'));
  return feedItems.filter(el => el.getBoundingClientRect().height > 100);
}

function facebookGetPostId(el: Element): string | null {
  // Look for post permalink patterns
  const patterns = [
    /\/posts\/(\w+)/,
    /story_fbid=(\d+)/,
    /\/permalink\/(\d+)/,
    /\/photos\/[^/]+\/(\d+)/,
    /fbid=(\d+)/
  ];
  
  const links = Array.from(el.querySelectorAll('a[href]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    for (const pattern of patterns) {
      const match = href.match(pattern);
      if (match) return 'fb_' + match[1];
    }
  }

  // Fallback: hash the text content for uniqueness
  const text = el.textContent?.substring(0, 100) || '';
  if (text.length > 20) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    return 'fb_h' + Math.abs(hash).toString(36);
  }

  return null;
}

function facebookGetText(el: Element): string {
  // Facebook post text is usually in dir="auto" divs
  // The main post text tends to be the largest text block
  const textDivs = Array.from(el.querySelectorAll('div[dir="auto"]'));
  
  let bestText = '';
  let bestLength = 0;
  
  for (const div of textDivs) {
    const text = div.textContent || '';
    // Skip very short text (likely UI labels) and very long (likely includes comments)
    if (text.length > 20 && text.length < 5000 && text.length > bestLength) {
      // Avoid picking up comment text — check if this div is nested too deep
      const depth = getDepthFrom(div, el);
      if (depth < 15) { // Post text is usually not deeply nested
        bestText = text;
        bestLength = text.length;
      }
    }
  }

  // If first approach fails, try "See more" expanded text
  if (!bestText) {
    const seeMoreParent = queryFirst(el, ['div[data-ad-preview="message"]', 'div[data-ad-comet-preview="message"]']);
    if (seeMoreParent) {
      bestText = seeMoreParent.textContent || '';
    }
  }

  return bestText;
}

function getDepthFrom(child: Element, ancestor: Element): number {
  let depth = 0;
  let current: Element | null = child;
  while (current && current !== ancestor && depth < 30) {
    current = current.parentElement;
    depth++;
  }
  return depth;
}

function facebookGetAuthor(el: Element): string {
  // Author name is typically in a strong tag or a link near the top of the post
  // Strategy 1: h2/h3/h4 with a link inside (common pattern for post author)
  for (const tag of ['h2', 'h3', 'h4']) {
    const heading = el.querySelector(tag);
    if (heading) {
      const link = heading.querySelector('a[href]');
      if (link) {
        const name = link.textContent?.trim();
        if (name && name.length > 1 && name.length < 60) return name;
      }
    }
  }
  
  // Strategy 2: strong tag with a link near the top
  const strongs = Array.from(el.querySelectorAll('strong'));
  for (const strong of strongs) {
    const link = strong.querySelector('a') || strong.closest('a');
    if (link) {
      const name = strong.textContent?.trim();
      if (name && name.length > 1 && name.length < 60) return name;
    }
  }

  // Strategy 3: first link that looks like a profile link
  const links = Array.from(el.querySelectorAll('a[href]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (href.includes('/profile.php') || (href.startsWith('https://www.facebook.com/') && !href.includes('/posts/') && !href.includes('/photos/'))) {
      const name = link.textContent?.trim();
      if (name && name.length > 1 && name.length < 60 && !name.includes('\n')) return name;
    }
  }

  return 'unknown';
}

function facebookDetectMedia(el: Element): MediaInfo {
  const result: MediaInfo = { hasVideo: false, videoDescription: '', videoThumbnailUrl: '', imageUrls: [] };

  // Video detection
  const video = el.querySelector('video');
  if (video) {
    result.hasVideo = true;
    result.videoDescription = 'Video on Facebook post';
    const poster = video.getAttribute('poster');
    if (poster) result.videoThumbnailUrl = poster;
  }

  // YouTube links
  if (!result.hasVideo) {
    const ytLink = el.querySelector('a[href*="youtube.com"], a[href*="youtu.be"]');
    if (ytLink) {
      const href = ytLink.getAttribute('href') || '';
      const ytMatch = href.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
      if (ytMatch) {
        result.hasVideo = true;
        result.videoDescription = 'YouTube video';
        result.videoThumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
  }

  // Image detection — Facebook images are in img tags, skip profile pics and icons
  const imgs = Array.from(el.querySelectorAll('img[src]'));
  for (const img of imgs) {
    const src = img.getAttribute('src') || '';
    const width = (img as HTMLImageElement).naturalWidth || parseInt(img.getAttribute('width') || '0');
    const height = (img as HTMLImageElement).naturalHeight || parseInt(img.getAttribute('height') || '0');
    
    // Filter: must be a scontent/fbcdn image, large enough to be a post image (not icon/emoji/profile)
    if ((src.includes('scontent') || src.includes('fbcdn')) 
        && !src.includes('emoji') 
        && (width > 200 || height > 200 || (!width && !height))) {
      // Check element size as fallback
      const rect = img.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        result.imageUrls.push(src);
      }
    }
  }

  return result;
}

// ============================================================
// INSTAGRAM EXTRACTORS
// ============================================================

function instagramFindPosts(): Element[] {
  // Strategy 1: article elements (Instagram uses these for feed posts)
  const articles = Array.from(document.querySelectorAll('article'));
  if (articles.length > 0) {
    return articles.filter(a => a.getBoundingClientRect().height > 150);
  }

  // Strategy 2: post containers with role
  const roleArticles = Array.from(document.querySelectorAll('[role="presentation"]'));
  const withMedia = roleArticles.filter(el => 
    el.querySelector('img[srcset], video') && el.getBoundingClientRect().height > 150
  );
  if (withMedia.length > 0) return withMedia;

  return [];
}

function instagramGetPostId(el: Element): string | null {
  // Instagram post links contain /p/ or /reel/ followed by shortcode
  const links = Array.from(el.querySelectorAll('a[href]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
    if (match) return 'ig_' + match[2];
  }

  // Fallback: look at the current URL if viewing a single post
  const urlMatch = window.location.pathname.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
  if (urlMatch) return 'ig_' + urlMatch[2];

  // Hash fallback
  const text = el.textContent?.substring(0, 100) || '';
  if (text.length > 10) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    return 'ig_h' + Math.abs(hash).toString(36);
  }

  return null;
}

function instagramGetText(el: Element): string {
  // Instagram captions — look for the text below the image
  // Strategy 1: span elements within the caption area (usually has a "more" button)
  const spans = Array.from(el.querySelectorAll('span'));
  let bestCaption = '';
  
  for (const span of spans) {
    const text = span.textContent || '';
    // Caption text is usually substantial but not too long from a single span
    if (text.length > 20 && text.length < 3000 && text.length > bestCaption.length) {
      // Avoid UI text like "likes", "comments", "share"
      if (!text.match(/^\d+\s*(likes?|comments?|views?|shares?)/i)) {
        bestCaption = text;
      }
    }
  }

  // Strategy 2: look for dir="auto" divs (similar to Facebook)
  if (!bestCaption) {
    const divs = Array.from(el.querySelectorAll('div[dir="auto"]'));
    for (const div of divs) {
      const text = div.textContent || '';
      if (text.length > 20 && text.length > bestCaption.length) {
        bestCaption = text;
      }
    }
  }

  // Strategy 3: alt text from images often contains the caption
  if (!bestCaption) {
    const imgs = el.querySelectorAll('img[alt]');
    for (const img of Array.from(imgs)) {
      const alt = img.getAttribute('alt') || '';
      if (alt.length > 30 && alt.length > bestCaption.length) {
        bestCaption = alt;
      }
    }
  }

  return bestCaption;
}

function instagramGetAuthor(el: Element): string {
  // Strategy 1: header link that looks like a username (no spaces, short)
  const headerLinks = Array.from(el.querySelectorAll('header a[href^="/"]'));
  for (const link of headerLinks) {
    const href = link.getAttribute('href') || '';
    const username = href.replace(/\//g, '');
    if (username.length > 0 && username.length < 31 && /^[a-zA-Z0-9._]+$/.test(username)) {
      return username;
    }
  }

  // Strategy 2: any link that matches username pattern near top of post
  const links = Array.from(el.querySelectorAll('a[href^="/"]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/^\/([a-zA-Z0-9._]{1,30})\/?$/);
    if (match) return match[1];
  }

  return 'unknown';
}

function instagramDetectMedia(el: Element): MediaInfo {
  const result: MediaInfo = { hasVideo: false, videoDescription: '', videoThumbnailUrl: '', imageUrls: [] };

  // Video
  const video = el.querySelector('video');
  if (video) {
    result.hasVideo = true;
    result.videoDescription = 'Video on Instagram post';
    const poster = video.getAttribute('poster');
    if (poster) result.videoThumbnailUrl = poster;
  }

  // Images — Instagram uses img with srcset for high-res
  const imgs = Array.from(el.querySelectorAll('img[srcset], img[src*="instagram"]'));
  for (const img of imgs) {
    const src = img.getAttribute('src') || '';
    // Skip profile pictures (small, circular) and UI icons
    if (src.includes('instagram') || src.includes('cdninstagram') || src.includes('fbcdn')) {
      const rect = img.getBoundingClientRect();
      if (rect.width > 150 && rect.height > 150) {
        result.imageUrls.push(src);
      }
    }
  }

  return result;
}

// ============================================================
// PLATFORM ROUTER — delegates to the right extractors
// ============================================================

function findPosts(): Element[] {
  switch (PLATFORM) {
    case 'twitter': return twitterFindPosts();
    case 'facebook': return facebookFindPosts();
    case 'instagram': return instagramFindPosts();
    default: return [];
  }
}

function getPostId(el: Element): string | null {
  switch (PLATFORM) {
    case 'twitter': return twitterGetPostId(el);
    case 'facebook': return facebookGetPostId(el);
    case 'instagram': return instagramGetPostId(el);
    default: return null;
  }
}

function getPostText(el: Element): string {
  switch (PLATFORM) {
    case 'twitter': return twitterGetText(el);
    case 'facebook': return facebookGetText(el);
    case 'instagram': return instagramGetText(el);
    default: return '';
  }
}

function getPostAuthor(el: Element): string {
  switch (PLATFORM) {
    case 'twitter': return twitterGetAuthor(el);
    case 'facebook': return facebookGetAuthor(el);
    case 'instagram': return instagramGetAuthor(el);
    default: return 'unknown';
  }
}

function detectMedia(el: Element): MediaInfo {
  switch (PLATFORM) {
    case 'twitter': return twitterDetectMedia(el);
    case 'facebook': return facebookDetectMedia(el);
    case 'instagram': return instagramDetectMedia(el);
    default: return { hasVideo: false, videoDescription: '', videoThumbnailUrl: '', imageUrls: [] };
  }
}

// ============================================================
// COMMENT EXTRACTORS — grab visible comments/replies near a post
// ============================================================

function twitterExtractComments(el: Element): string[] {
  const comments: string[] = [];
  const mainText = getTweetTextContent(el);

  // Strategy 1: Walk UP to the conversation container, then find all tweet
  // articles below this one. Twitter wraps threads in a container div that
  // holds the main tweet + reply previews.
  let container = el.parentElement;
  // Walk up a few levels to find the conversation wrapper
  for (let i = 0; i < 5 && container; i++) {
    const articles = Array.from(container.querySelectorAll('article[data-testid="tweet"], article'));
    if (articles.length > 1) {
      let foundSelf = false;
      for (const art of articles) {
        if (art === el || art.contains(el) || el.contains(art)) {
          foundSelf = true;
          continue;
        }
        if (!foundSelf) continue;
        const replyText = queryFirst(art, [
          '[data-testid="tweetText"]',
          '[data-testid="tweet-text"]',
          '[lang]'
        ]);
        if (replyText) {
          const text = replyText.textContent?.trim();
          if (text && text.length > 5 && text !== mainText) {
            comments.push(text);
          }
        }
        if (comments.length >= 15) break;
      }
      if (comments.length > 0) break;
    }
    container = container.parentElement;
  }

  // Strategy 2: If on a thread/status page, grab all tweet text blocks on
  // the page after the main tweet
  if (comments.length === 0 && window.location.pathname.includes('/status/')) {
    const allTweetTexts = Array.from(document.querySelectorAll('[data-testid="tweetText"]'));
    let foundMain = false;
    for (const block of allTweetTexts) {
      const text = block.textContent?.trim();
      if (text === mainText) { foundMain = true; continue; }
      if (!foundMain) continue;
      if (text && text.length > 5) comments.push(text);
      if (comments.length >= 15) break;
    }
  }

  // Strategy 3: Look inside the article for expanded reply text
  if (comments.length === 0) {
    const allTextBlocks = Array.from(el.querySelectorAll('[data-testid="tweetText"], [lang]'));
    for (let i = 1; i < allTextBlocks.length && comments.length < 15; i++) {
      const text = allTextBlocks[i].textContent?.trim();
      if (text && text.length > 5 && text !== mainText) comments.push(text);
    }
  }

  return comments;
}

/** Helper: get the main tweet text for deduplication */
function getTweetTextContent(el: Element): string {
  const textEl = queryFirst(el, [
    '[data-testid="tweetText"]',
    '[data-testid="tweet-text"]',
    '[lang]'
  ]);
  return textEl?.textContent?.trim() || '';
}

function facebookExtractComments(el: Element): string[] {
  const comments: string[] = [];
  const mainText = facebookGetText(el);
  const seen = new Set<string>();

  // Strategy 1: Nested role="article" elements (Facebook nests comments as sub-articles)
  const nestedArticles = Array.from(el.querySelectorAll('[role="article"]'));
  for (const nested of nestedArticles) {
    if (nested === el) continue;
    const textDivs = Array.from(nested.querySelectorAll('div[dir="auto"]'));
    for (const div of textDivs) {
      const text = div.textContent?.trim();
      if (text && text.length > 5 && text.length < 500 && text !== mainText && !seen.has(text)) {
        seen.add(text);
        comments.push(text);
        break;
      }
    }
    if (comments.length >= 15) break;
  }

  // Strategy 2: Walk UP to the feed unit container, then look for comment
  // sections below the post (Facebook wraps posts + comments in a pagelet)
  if (comments.length === 0) {
    let container = el.parentElement;
    for (let i = 0; i < 6 && container; i++) {
      // Facebook comment ULs often follow the post
      const allDirAuto = Array.from(container.querySelectorAll('div[dir="auto"]'));
      let foundMain = false;
      for (const div of allDirAuto) {
        const text = div.textContent?.trim();
        if (text === mainText) { foundMain = true; continue; }
        if (!foundMain) continue;
        if (text && text.length > 5 && text.length < 500 && !seen.has(text)) {
          // Skip very short UI labels
          if (text.match(/^(Like|Reply|Share|Comment|\d+ (likes?|replies|comments?))/i)) continue;
          seen.add(text);
          comments.push(text);
        }
        if (comments.length >= 15) break;
      }
      if (comments.length > 0) break;
      container = container.parentElement;
    }
  }

  return comments;
}

function instagramExtractComments(el: Element): string[] {
  const comments: string[] = [];
  const mainCaption = instagramGetText(el);
  const seen = new Set<string>();

  // Strategy 1: Look for comment-like structures — on Instagram post pages,
  // comments are usually in a list/section below the post
  // Walk up to find the broader post container
  let container = el.parentElement;
  for (let i = 0; i < 5 && container; i++) {
    const spans = Array.from(container.querySelectorAll('span'));
    let pastCaption = false;

    for (const span of spans) {
      const text = span.textContent?.trim();
      if (!text || text.length < 5) continue;

      // Skip UI elements
      if (text.match(/^\d+\s*(likes?|views?|comments?|hours?|days?|weeks?|minutes?|seconds?)/i)) continue;
      if (text.match(/^(Reply|View replies|View all|Liked by|others|more)/i)) continue;

      // Once we've passed the caption, collect subsequent text as comments
      if (text === mainCaption || (mainCaption && text.length > 40 && mainCaption.startsWith(text.substring(0, 30)))) {
        pastCaption = true;
        continue;
      }

      if (pastCaption && text.length > 5 && text.length < 500 && !seen.has(text)) {
        seen.add(text);
        comments.push(text);
      }

      if (comments.length >= 15) break;
    }

    if (comments.length > 0) break;
    container = container.parentElement;
  }

  // Strategy 2: On post detail pages (/p/ or /reel/), look at the whole page
  if (comments.length === 0 && window.location.pathname.match(/\/(p|reel)\//)) {
    const allSpans = Array.from(document.querySelectorAll('span'));
    let pastCaption = false;
    for (const span of allSpans) {
      const text = span.textContent?.trim();
      if (!text || text.length < 5) continue;
      if (text.match(/^\d+\s*(likes?|views?|comments?|hours?|days?|weeks?|minutes?|seconds?)/i)) continue;
      if (text.match(/^(Reply|View replies|View all|Liked by|others|more|Log in|Sign up)/i)) continue;

      if (text === mainCaption) { pastCaption = true; continue; }

      if (pastCaption && text.length > 5 && text.length < 500 && !seen.has(text)) {
        seen.add(text);
        comments.push(text);
      }
      if (comments.length >= 15) break;
    }
  }

  return comments;
}

function extractComments(el: Element): string[] {
  switch (PLATFORM) {
    case 'twitter': return twitterExtractComments(el);
    case 'facebook': return facebookExtractComments(el);
    case 'instagram': return instagramExtractComments(el);
    default: return [];
  }
}

// ============================================================
// YOUTUBE ID HELPER
// ============================================================

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ============================================================
// SHARED UI — Badge, Panel, Communication (platform-agnostic)
// Two-tier: quick scan sets badge color, hover triggers deep analysis
// ============================================================

function createPanel(analysis: AnalysisResult): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'think-social-panel';
  
  const ratingEmoji = { green: '🟢', amber: '🟡', red: '🔴' };
  
  panel.innerHTML = `
    <div class="ts-panel-header">
      <span class="ts-panel-icon">🔍</span>
      <span class="ts-panel-title">UNDER THE HOOD</span>
      <button class="ts-panel-close">&times;</button>
    </div>
    <div class="ts-panel-signal">
      <span class="ts-signal-label">INITIAL ASSESSMENT:</span>
      <span class="ts-signal-value" data-rating="${analysis.overall}">
        ${ratingEmoji[analysis.overall]} ${RATING_LABELS[analysis.overall]}
      </span>
    </div>
    <div class="ts-panel-divider"></div>
    <div class="ts-panel-section-title">ANALYSIS DIMENSIONS: <span class="ts-dim-hint">(tap any row to see why)</span></div>
    <div class="ts-panel-dimensions">
      ${[
        { name: 'Political Standpoint', dim: analysis.perspective },
        { name: 'How Factual?', dim: analysis.verification },
        { name: 'Balance', dim: analysis.balance },
        { name: 'Source History', dim: analysis.source },
        { name: 'Tone', dim: analysis.tone }
      ].map(d => `
      <div class="ts-dimension ts-dimension-expandable">
        <span class="ts-dim-name">${d.name}</span>
        <span class="ts-dim-rating">${ratingEmoji[d.dim.rating]}</span>
        <span class="ts-dim-label">${d.dim.label}</span>
        ${d.dim.reason ? `<div class="ts-dim-reason">${d.dim.reason}</div>` : ''}
      </div>`).join('')}
    </div>
    <div class="ts-panel-divider"></div>
    <div class="ts-panel-summary">
      <div class="ts-summary-title">CONTEXTUAL SUMMARY:</div>
      <div class="ts-summary-text">${analysis.summary}</div>
    </div>
    ${analysis.counterPerspective ? `
    <div class="ts-panel-divider"></div>
    <div class="ts-counter-perspective">
      <div class="ts-counter-perspective-title">💡 ALTERNATIVE VIEWPOINT:</div>
      <div class="ts-counter-perspective-text">${analysis.counterPerspective}</div>
    </div>
    ` : ''}
    ${analysis.counterSources && analysis.counterSources.length > 0 ? `
    <div class="ts-panel-divider"></div>
    <div class="ts-counter-sources">
      <div class="ts-counter-title">🌐 FURTHER READING:</div>
      <div class="ts-counter-subtitle">Real articles — labelled by how they relate to this post:</div>
      ${analysis.counterSources.map(src => {
        const stanceLabel = src.stance === 'counter' ? '↔ Counter' : src.stance === 'supporting' ? '→ Supporting' : '• Neutral';
        const stanceClass = src.stance === 'counter' ? 'ts-stance-counter' : src.stance === 'supporting' ? 'ts-stance-supporting' : 'ts-stance-neutral';
        return `
        <a class="ts-counter-item ts-counter-link" href="${src.url}" target="_blank" rel="noopener noreferrer">
          <div class="ts-counter-outlet">
            <span class="ts-counter-name">${src.outlet}</span>
            <span class="ts-counter-stance ${stanceClass}">${stanceLabel}</span>
          </div>
          <div class="ts-counter-headline">${src.headline}</div>
          ${src.snippet ? `<div class="ts-counter-snippet">${src.snippet}</div>` : ''}
        </a>`;
      }).join('')}
    </div>
    ` : ''}
    ${analysis.hasVideo && analysis.videoAnalysis ? `
    <div class="ts-panel-divider"></div>
    <div class="ts-video-analysis">
      <div class="ts-video-title">🎬 VIDEO CONTEXT:</div>
      <div class="ts-video-text">${analysis.videoAnalysis}</div>
    </div>
    ` : ''}
    ${analysis.commentAnalysis ? `
    <div class="ts-panel-divider"></div>
    <div class="ts-comment-climate">
      <div class="ts-comment-title">💬 COMMENT CLIMATE:</div>
      <div class="ts-comment-agreement" data-level="${analysis.commentAnalysis.agreementLevel}">
        ${(() => {
          const labels: Record<string, string> = {
            'echo-chamber': '🔴 Echo Chamber',
            'mostly-agree': '🟡 Mostly Agreement',
            'mixed': '🟢 Mixed Views',
            'mostly-disagree': '🟡 Mostly Disagreement',
            'polarised': '🔴 Polarised'
          };
          return labels[analysis.commentAnalysis!.agreementLevel] || analysis.commentAnalysis!.agreementLevel;
        })()}
      </div>
      <div class="ts-comment-tone">${analysis.commentAnalysis.overallTone}</div>
      <div class="ts-comment-lean">${analysis.commentAnalysis.leaningSummary}</div>
      ${analysis.commentAnalysis.highlights && analysis.commentAnalysis.highlights.length > 0 ? `
      <div class="ts-comment-highlights-title">Worth reading:</div>
      ${analysis.commentAnalysis.highlights.map(h => {
        const sentimentIcon: Record<string, string> = { agree: '👍', disagree: '👎', nuanced: '🤔', neutral: '➖' };
        return `
        <div class="ts-comment-highlight" data-sentiment="${h.sentiment}">
          <div class="ts-highlight-header">
            <span class="ts-highlight-icon">${sentimentIcon[h.sentiment] || '💬'}</span>
            <span class="ts-highlight-author">@${h.author}</span>
            <span class="ts-highlight-sentiment">${h.sentiment}</span>
          </div>
          <div class="ts-highlight-text">"${h.text}"</div>
          <div class="ts-highlight-reason">${h.reason}</div>
        </div>`;
      }).join('')}
      ` : ''}
    </div>
    ` : ''}
    <div class="ts-panel-disclaimer">
      AI-generated analysis — may contain errors. Inkline provides context, not verdicts. Always verify independently.
    </div>
    <div class="ts-panel-footer">
      <span class="ts-confidence">Confidence: ${Math.round(analysis.confidence * 100)}%</span>
      <span class="ts-branding">🔍 Inkline</span>
    </div>
  `;
  
  const closeBtn = panel.querySelector('.ts-panel-close');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.remove('ts-panel-visible');
    activePanel = null;
  });

  panel.addEventListener('wheel', (e) => {
    const atTop = panel.scrollTop === 0;
    const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight;
    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) e.preventDefault();
    e.stopPropagation();
  }, { passive: false });

  panel.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: false });
  panel.addEventListener('click', (e) => { e.stopPropagation(); });

  // Expandable dimension rows — click to toggle reasoning
  panel.querySelectorAll('.ts-dimension-expandable').forEach(dim => {
    dim.addEventListener('click', (e) => {
      e.stopPropagation();
      dim.classList.toggle('ts-dim-expanded');
    });
  });
  
  return panel;
}

// Create the "loading deep analysis" panel shown while waiting
function createLoadingPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'think-social-panel';
  panel.innerHTML = `
    <div class="ts-panel-header">
      <span class="ts-panel-icon">🔍</span>
      <span class="ts-panel-title">UNDER THE HOOD</span>
      <button class="ts-panel-close">&times;</button>
    </div>
    <div class="ts-panel-loading-deep">
      <div class="think-social-spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto 12px;"></div>
      <div style="text-align:center;color:#a5b4fc;font-size:12px;font-weight:500;">Running deep analysis...</div>
      <div style="text-align:center;color:#6b7280;font-size:11px;margin-top:6px;">Searching the web, verifying sources, checking relevance</div>
    </div>
    <div class="ts-panel-disclaimer">
      AI-generated analysis — may contain errors. Inkline provides context, not verdicts. Always verify independently.
    </div>
  `;

  const closeBtn = panel.querySelector('.ts-panel-close');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.remove('ts-panel-visible');
    activePanel = null;
  });

  panel.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: false });
  panel.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: false });
  panel.addEventListener('click', (e) => { e.stopPropagation(); });

  return panel;
}

function createLoadingBadge(): HTMLElement {
  const badge = document.createElement('div');
  badge.className = 'think-social-badge think-social-loading';
  badge.title = 'Analyzing...';
  const spinner = document.createElement('div');
  spinner.className = 'think-social-spinner';
  badge.appendChild(spinner);
  return badge;
}

function injectBadge(article: Element, postId: string): HTMLElement | null {
  if (article.querySelector('.think-social-badge')) return null;
  (article as HTMLElement).classList.add('think-social-positioned');
  const badge = createLoadingBadge();
  badge.setAttribute('data-post-id', postId);
  article.appendChild(badge);
  return badge;
}

// Set badge to show quick-scan traffic light (no panel yet — panel comes on hover)
function setBadgeQuick(postId: string, quickResult: { overall: 'green' | 'amber' | 'red'; summary: string } | null, error?: string): void {
  const badge = document.querySelector(`.think-social-badge[data-post-id="${postId}"]`);
  if (!badge) return;

  badge.classList.remove('think-social-loading');
  const badgeEl = badge as HTMLElement;

  if (error || !quickResult) {
    badgeEl.classList.add('think-social-error');
    badgeEl.title = error || 'Analysis unavailable';
    badgeEl.innerHTML = '<div class="think-social-error-icon">⚠️</div>';
    return;
  }

  badgeEl.setAttribute('data-rating', quickResult.overall);
  badgeEl.title = `${RATING_LABELS[quickResult.overall]} — hover for details`;

  const light = document.createElement('div');
  light.className = 'think-social-light';
  light.style.backgroundColor = COLORS[quickResult.overall];
  badgeEl.innerHTML = '';
  badgeEl.appendChild(light);

  // Wire up hover → deep analysis and click → show panel
  setupBadgeInteraction(badgeEl, postId);
}

// Position and show a panel next to a badge
function showPanel(panel: HTMLElement, badgeEl: HTMLElement): void {
  if (activePanel && activePanel !== panel) {
    activePanel.classList.remove('ts-panel-visible');
  }

  const rect = badgeEl.getBoundingClientRect();
  const panelWidth = 340;
  const panelMaxHeight = 520;
  let top = rect.bottom + 8;
  let left = rect.right - panelWidth;
  if (left < 8) left = 8;
  if (top + panelMaxHeight > window.innerHeight) {
    top = rect.top - panelMaxHeight - 8;
    if (top < 8) top = 8;
  }
  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
  panel.classList.add('ts-panel-visible');
  activePanel = panel;
}

// Setup hover-to-deep-analyze and click-to-show-panel on a badge
function setupBadgeInteraction(badgeEl: HTMLElement, postId: string): void {
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;

  // On hover: pre-fetch deep analysis (if not already done)
  badgeEl.addEventListener('mouseenter', () => {
    const meta = postMetaMap.get(postId);
    if (!meta || meta.deepResult || meta.deepPending) return;

    // Start deep analysis after a brief hover (300ms to avoid accidental triggers)
    hoverTimer = setTimeout(() => {
      triggerDeepAnalysis(postId);
    }, 300);
  });

  badgeEl.addEventListener('mouseleave', () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  });

  // On click: show the panel (deep if available, loading state if pending, quick summary if not yet started)
  badgeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    const meta = postMetaMap.get(postId);
    if (!meta) return;

    // Remove any existing panel for this post
    const existingPanel = document.querySelector(`[data-for-post="${postId}"]`);
    if (existingPanel) {
      const isVisible = existingPanel.classList.contains('ts-panel-visible');
      if (isVisible) {
        existingPanel.classList.remove('ts-panel-visible');
        activePanel = null;
        return;
      }
    }

    // If deep result is ready, show the full panel
    if (meta.deepResult) {
      let panel = document.querySelector(`[data-for-post="${postId}"]`) as HTMLElement;
      if (!panel) {
        panel = createPanel(meta.deepResult);
        panel.setAttribute('data-for-post', postId);
        document.body.appendChild(panel);
      }
      showPanel(panel, badgeEl);
      return;
    }

    // Otherwise trigger deep analysis and show loading panel
    if (!meta.deepPending) {
      triggerDeepAnalysis(postId);
    }

    // Show loading panel
    let loadingPanel = document.querySelector(`[data-for-post="${postId}"]`) as HTMLElement;
    if (!loadingPanel) {
      loadingPanel = createLoadingPanel();
      loadingPanel.setAttribute('data-for-post', postId);
      document.body.appendChild(loadingPanel);
    }
    showPanel(loadingPanel, badgeEl);
  });
}

// Trigger deep analysis for a post
function triggerDeepAnalysis(postId: string): void {
  const meta = postMetaMap.get(postId);
  if (!meta || meta.deepResult || meta.deepPending) return;

  // Re-extract comments fresh from the DOM — they may have loaded since
  // the initial post detection (e.g. user scrolled into thread, or platform
  // lazy-loaded comments)
  const badge = document.querySelector(`.think-social-badge[data-post-id="${postId}"]`);
  const article = badge?.closest('.think-social-positioned');
  if (article) {
    const freshComments = extractComments(article);
    if (freshComments.length > meta.comments.length) {
      console.log(`[Inkline] Re-extracted comments: ${meta.comments.length} → ${freshComments.length}`);
      meta.comments = freshComments;
    }
  }

  meta.deepPending = true;
  console.log(`[Inkline] Triggering deep analysis for ${postId} (${meta.comments.length} comments)`);

  chrome.runtime.sendMessage(
    {
      type: 'DEEP_ANALYZE',
      payload: {
        postId,
        text: meta.text,
        author: meta.author,
        hasVideo: meta.media.hasVideo,
        videoDescription: meta.media.videoDescription,
        videoThumbnailUrl: meta.media.videoThumbnailUrl,
        imageUrls: meta.media.imageUrls,
        comments: meta.comments
      }
    },
    (response) => {
      meta.deepPending = false;

      if (response?.payload?.analysis) {
        meta.deepResult = response.payload.analysis;

        // Update badge color if deep analysis changed the rating
        const badge = document.querySelector(`.think-social-badge[data-post-id="${postId}"]`) as HTMLElement;
        if (badge && meta.deepResult) {
          badge.setAttribute('data-rating', meta.deepResult.overall);
          badge.title = RATING_LABELS[meta.deepResult.overall];
          const light = badge.querySelector('.think-social-light') as HTMLElement;
          if (light) light.style.backgroundColor = COLORS[meta.deepResult.overall];
        }

        // Replace loading panel with full panel if it's currently visible
        const existingPanel = document.querySelector(`[data-for-post="${postId}"]`);
        const wasVisible = existingPanel?.classList.contains('ts-panel-visible');
        if (existingPanel) existingPanel.remove();

        const fullPanel = createPanel(meta.deepResult!);
        fullPanel.setAttribute('data-for-post', postId);
        document.body.appendChild(fullPanel);

        if (wasVisible && badge) {
          showPanel(fullPanel, badge);
        }
      } else if (response?.payload?.error) {
        console.error(`[Inkline] Deep analysis failed for ${postId}:`, response.payload.error);
      }
    }
  );
}

// Global click-to-close handler (registered once)
document.addEventListener('click', (e) => {
  if (activePanel) {
    const target = e.target as Node;
    const clickedBadge = (target as Element)?.closest?.('.think-social-badge');
    if (!activePanel.contains(target) && !clickedBadge) {
      activePanel.classList.remove('ts-panel-visible');
      activePanel = null;
    }
  }
});

// ============================================================
// POST PROCESSING PIPELINE — Tier 1 quick scan
// ============================================================

async function processPost(article: Element): Promise<void> {
  const postId = getPostId(article);
  if (!postId) return;
  if (processedPosts.has(postId) || pendingPosts.has(postId)) return;

  const text = getPostText(article);
  if (!text || text.length < 10) return;

  const author = getPostAuthor(article);
  const media = detectMedia(article);
  const comments = extractComments(article);

  if (comments.length > 0) {
    console.log(`[Inkline] Found ${comments.length} comments for ${postId}`);
  }

  // Store metadata for later deep analysis on hover
  postMetaMap.set(postId, { postId, text, author, media, comments });

  pendingPosts.add(postId);

  const badge = injectBadge(article, postId);
  if (!badge) {
    pendingPosts.delete(postId);
    return;
  }

  // Tier 1: Quick scan — cheap, just gets the traffic light color
  chrome.runtime.sendMessage(
    {
      type: 'QUICK_SCAN',
      payload: { postId, text, author }
    },
    (response) => {
      pendingPosts.delete(postId);
      processedPosts.add(postId);

      if (response?.payload) {
        const { quickResult, error } = response.payload;
        if (quickResult) {
          const meta = postMetaMap.get(postId);
          if (meta) meta.quickResult = quickResult;

          // Auto-trigger deep analysis for amber/red — pre-cache so it's
          // ready instantly when the user clicks
          if (quickResult.overall === 'amber' || quickResult.overall === 'red') {
            console.log(`[Inkline] Auto-deep for ${quickResult.overall} post ${postId}`);
            triggerDeepAnalysis(postId);
          }
        }
        setBadgeQuick(postId, quickResult, error);
      }
    }
  );
}

function processVisiblePosts(): void {
  const posts = findPosts();
  posts.forEach(post => processPost(post));
}

// ============================================================
// MUTATION OBSERVER + INIT
// ============================================================

function observePosts(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
        break;
      }
    }
    if (shouldProcess) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processVisiblePosts, 300);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log(`[Inkline] Observer started on ${PLATFORM}`);
}

function init(): void {
  if (PLATFORM === 'unknown') {
    console.log('[Inkline] Unknown platform, not activating');
    return;
  }

  console.log(`[Inkline] Content script loaded on ${PLATFORM} (two-tier mode)`);
  processVisiblePosts();
  observePosts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
