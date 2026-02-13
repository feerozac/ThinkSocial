// Inkline - Content Script for Twitter/X
// Detects tweets and injects analysis badges
// Uses resilient multi-strategy selectors to survive DOM changes

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

// Track processed tweets to avoid duplicates
const processedTweets = new Set<string>();
const pendingTweets = new Set<string>();

// Track the currently visible panel so we can close it when opening another
let activePanel: HTMLElement | null = null;

// Rating colors
const COLORS = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444'
};

// Rating labels for the badge tooltip — scholarly, never claims truth
const RATING_LABELS = {
  green: 'Appears well-sourced',
  amber: 'Additional context may be helpful',
  red: 'Consider seeking further sources'
};

// ============================================================
// RESILIENT SELECTORS — multiple strategies for each extraction
// If Twitter changes data-testid attributes, fallbacks kick in
// ============================================================

/** Try multiple selector strategies in order, return first match */
function queryFirst(el: Element, selectors: string[]): Element | null {
  for (const sel of selectors) {
    try {
      const result = el.querySelector(sel);
      if (result) return result;
    } catch { /* invalid selector, skip */ }
  }
  return null;
}

/** Try multiple selector strategies, return all matches from first that works */
function queryAllFirst(el: Element, selectorSets: string[]): NodeListOf<Element> | Element[] {
  for (const sel of selectorSets) {
    try {
      const results = el.querySelectorAll(sel);
      if (results.length > 0) return results;
    } catch { /* skip */ }
  }
  return [];
}

/** Find all tweet articles using multiple strategies */
function findTweetArticles(): Element[] {
  // Strategy 1: data-testid (current Twitter)
  let articles = document.querySelectorAll('article[data-testid="tweet"]');
  if (articles.length > 0) return Array.from(articles);
  
  // Strategy 2: article elements with a time element and status link (structural)
  const allArticles = document.querySelectorAll('article');
  const valid = Array.from(allArticles).filter(a => 
    a.querySelector('time') && a.querySelector('a[href*="/status/"]')
  );
  if (valid.length > 0) return valid;

  // Strategy 3: role="article" (accessibility-based)
  const roleArticles = document.querySelectorAll('[role="article"]');
  const validRole = Array.from(roleArticles).filter(a =>
    a.querySelector('time') && a.querySelector('a[href*="/status/"]')
  );
  if (validRole.length > 0) return validRole;

  return [];
}

// Extract tweet ID from article element
function getTweetId(article: Element): string | null {
  // Strategy 1: any link with /status/ in href
  const link = article.querySelector('a[href*="/status/"]');
  if (link) {
    const href = link.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  
  // Strategy 2: time element's parent link
  const timeElement = article.querySelector('time');
  if (timeElement) {
    const parent = timeElement.closest('a');
    const href = parent?.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }

  // Strategy 3: scan all links for status pattern
  const allLinks = Array.from(article.querySelectorAll('a[href]'));
  for (const a of allLinks) {
    const href = a.getAttribute('href') || '';
    const match = href.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  
  return null;
}

// Extract tweet text content — resilient to selector changes
function getTweetText(article: Element): string {
  // Strategy 1: data-testid (current)
  const selectors = [
    '[data-testid="tweetText"]',
    '[data-testid="tweet-text"]',
    '[data-testid="post-text"]',
    '[lang]'  // tweet text divs usually have a lang attribute
  ];
  
  const textEl = queryFirst(article, selectors);
  if (textEl) {
    return textEl.textContent || '';
  }

  // Strategy 2: find the largest text block that isn't a username
  const candidates = Array.from(article.querySelectorAll('div[dir="auto"]'));
  let bestText = '';
  for (const c of candidates) {
    const t = c.textContent || '';
    if (t.length > bestText.length && t.length > 20) {
      bestText = t;
    }
  }
  return bestText;
}

// Extract author username — resilient to selector changes
function getTweetAuthor(article: Element): string {
  // Strategy 1: data-testid (current)
  const userNameElement = queryFirst(article, [
    '[data-testid="User-Name"]',
    '[data-testid="user-name"]',
    '[data-testid="author"]'
  ]);
  if (userNameElement) {
    const usernameSpan = userNameElement.querySelector('a[href^="/"]');
    if (usernameSpan) {
      const href = usernameSpan.getAttribute('href');
      return href?.replace('/', '') || 'unknown';
    }
  }

  // Strategy 2: look for @username pattern in links
  const links = Array.from(article.querySelectorAll('a[href^="/"]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    // Username links are simple paths like "/elonmusk"
    if (/^\/[a-zA-Z0-9_]{1,15}$/.test(href)) {
      return href.replace('/', '');
    }
  }

  return 'unknown';
}

// Media detection result
interface MediaInfo {
  hasVideo: boolean;
  videoDescription: string;
  videoThumbnailUrl: string;
  imageUrls: string[];
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Detect all media in a tweet (video, images) and extract URLs
function detectMedia(article: Element): MediaInfo {
  const result: MediaInfo = {
    hasVideo: false,
    videoDescription: '',
    videoThumbnailUrl: '',
    imageUrls: []
  };

  // --- VIDEO DETECTION ---
  
  // Check for native Twitter video player (resilient selectors)
  const videoPlayer = queryFirst(article, [
    '[data-testid="videoPlayer"]',
    '[data-testid="video-player"]',
    '[data-testid="videoComponent"]'
  ]);
  if (videoPlayer) {
    result.hasVideo = true;
    
    const videoEl = videoPlayer.querySelector('video');
    const ariaLabel = videoPlayer.getAttribute('aria-label') || '';
    const altText = videoEl?.getAttribute('alt') || '';
    const captionEl = queryFirst(article, ['[data-testid="videoCaption"]', '[data-testid="video-caption"]']);
    const caption = captionEl?.textContent || '';
    
    result.videoDescription = [ariaLabel, altText, caption].filter(Boolean).join('. ') 
      || 'Video embedded in tweet';

    // Extract poster/thumbnail URL from the video element
    if (videoEl) {
      const poster = videoEl.getAttribute('poster');
      if (poster) {
        result.videoThumbnailUrl = poster;
      }
    }
    
    // Fallback: try to find a thumbnail image inside the video player
    if (!result.videoThumbnailUrl) {
      const thumbImg = videoPlayer.querySelector('img');
      if (thumbImg) {
        const src = thumbImg.getAttribute('src');
        if (src && !src.startsWith('data:')) {
          result.videoThumbnailUrl = src;
        }
      }
    }
  }
  
  // Check for embedded video links (YouTube, etc.)
  if (!result.hasVideo) {
    const cardLink = queryFirst(article, [
      '[data-testid="card.wrapper"]',
      '[data-testid="card-wrapper"]',
      '[data-testid="cardWrapper"]'
    ]);
    if (cardLink) {
      const linkEl = cardLink.querySelector('a[href*="youtube.com"], a[href*="youtu.be"], a[href*="vimeo.com"]');
      if (linkEl) {
        const href = linkEl.getAttribute('href') || '';
        const cardTitle = queryFirst(cardLink, [
          '[data-testid="card.layoutLarge.detail"] span',
          '[data-testid="card.layoutSmall.detail"] span',
          'span[dir="auto"]'
        ]);
        const title = cardTitle?.textContent || '';
        
        result.hasVideo = true;
        result.videoDescription = `External video: ${title || href}`.trim();
        
        // Get YouTube thumbnail if applicable
        const ytId = extractYouTubeId(href);
        if (ytId) {
          result.videoThumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }
        
        // Try card image as thumbnail fallback
        if (!result.videoThumbnailUrl) {
          const cardImg = cardLink.querySelector('img');
          if (cardImg) {
            const src = cardImg.getAttribute('src');
            if (src && !src.startsWith('data:')) {
              result.videoThumbnailUrl = src;
            }
          }
        }
      }
    }
  }
  
  // Fallback: any video element
  if (!result.hasVideo) {
    const anyVideo = article.querySelector('video');
    if (anyVideo) {
      result.hasVideo = true;
      result.videoDescription = 'Video embedded in tweet';
      const poster = anyVideo.getAttribute('poster');
      if (poster) {
        result.videoThumbnailUrl = poster;
      }
    }
  }

  // --- IMAGE DETECTION ---
  // Extract image URLs from tweet photos (resilient selectors)
  const tweetPhotos = queryAllFirst(article, [
    '[data-testid="tweetPhoto"] img',
    '[data-testid="tweet-photo"] img',
    '[data-testid="postPhoto"] img',
    'div[aria-label] img[src*="pbs.twimg.com/media"]'
  ]);
  tweetPhotos.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.includes('emoji') && !src.includes('profile_images')) {
      // Twitter image URLs - get a reasonable quality version
      let imageUrl = src;
      // Upgrade to medium quality if it's a pbs.twimg.com URL
      if (imageUrl.includes('pbs.twimg.com') && !imageUrl.includes('name=')) {
        imageUrl += '?format=jpg&name=medium';
      }
      result.imageUrls.push(imageUrl);
    }
  });

  return result;
}

// Create the traffic light badge element
function createBadge(rating: 'green' | 'amber' | 'red'): HTMLElement {
  const badge = document.createElement('div');
  badge.className = 'think-social-badge';
  badge.setAttribute('data-rating', rating);
  badge.title = RATING_LABELS[rating];
  
  // Create the light indicator
  const light = document.createElement('div');
  light.className = 'think-social-light';
  light.style.backgroundColor = COLORS[rating];
  
  badge.appendChild(light);
  
  return badge;
}

// Create the "Under the Hood" panel
function createPanel(analysis: AnalysisResult): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'think-social-panel';
  
  const ratingEmoji = {
    green: '🟢',
    amber: '🟡',
    red: '🔴'
  };
  
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
    <div class="ts-panel-section-title">ANALYSIS DIMENSIONS:</div>
    <div class="ts-panel-dimensions">
      <div class="ts-dimension">
        <span class="ts-dim-name">Political Standpoint</span>
        <span class="ts-dim-rating">${ratingEmoji[analysis.perspective.rating]}</span>
        <span class="ts-dim-label">${analysis.perspective.label}</span>
      </div>
      <div class="ts-dimension">
        <span class="ts-dim-name">How Factual?</span>
        <span class="ts-dim-rating">${ratingEmoji[analysis.verification.rating]}</span>
        <span class="ts-dim-label">${analysis.verification.label}</span>
      </div>
      <div class="ts-dimension">
        <span class="ts-dim-name">Balance</span>
        <span class="ts-dim-rating">${ratingEmoji[analysis.balance.rating]}</span>
        <span class="ts-dim-label">${analysis.balance.label}</span>
      </div>
      <div class="ts-dimension">
        <span class="ts-dim-name">Source History</span>
        <span class="ts-dim-rating">${ratingEmoji[analysis.source.rating]}</span>
        <span class="ts-dim-label">${analysis.source.label}</span>
      </div>
      <div class="ts-dimension">
        <span class="ts-dim-name">Tone</span>
        <span class="ts-dim-rating">${ratingEmoji[analysis.tone.rating]}</span>
        <span class="ts-dim-label">${analysis.tone.label}</span>
      </div>
    </div>
    <div class="ts-panel-divider"></div>
    <div class="ts-panel-summary">
      <div class="ts-summary-title">CONTEXTUAL SUMMARY:</div>
      <div class="ts-summary-text">${analysis.summary}</div>
    </div>
    ${analysis.counterSources && analysis.counterSources.length > 0 ? `
    <div class="ts-panel-divider"></div>
    <div class="ts-counter-sources">
      <div class="ts-counter-title">🌐 RELATED COVERAGE:</div>
      <div class="ts-counter-subtitle">Real articles from around the web on this topic:</div>
      ${analysis.counterSources.map(src => `
        <a class="ts-counter-item ts-counter-link" href="${src.url}" target="_blank" rel="noopener noreferrer">
          <div class="ts-counter-outlet">
            <span class="ts-counter-name">${src.outlet}</span>
            ${src.lean ? `<span class="ts-counter-lean">${src.lean}</span>` : ''}
          </div>
          <div class="ts-counter-headline">${src.headline}</div>
          ${src.snippet ? `<div class="ts-counter-snippet">${src.snippet}</div>` : ''}
        </a>
      `).join('')}
    </div>
    ` : ''}
    ${analysis.hasVideo && analysis.videoAnalysis ? `
    <div class="ts-panel-divider"></div>
    <div class="ts-video-analysis">
      <div class="ts-video-title">🎬 VIDEO CONTEXT:</div>
      <div class="ts-video-text">${analysis.videoAnalysis}</div>
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
  
  // Add close button handler
  const closeBtn = panel.querySelector('.ts-panel-close');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.remove('ts-panel-visible');
  });

  // Prevent scroll events from passing through to the page behind
  panel.addEventListener('wheel', (e) => {
    const el = panel;
    const atTop = el.scrollTop === 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;

    // Only stop propagation if the panel itself can scroll in the wheel direction
    if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
      // At scroll boundary - prevent page scroll
      e.preventDefault();
    }
    e.stopPropagation();
  }, { passive: false });

  // Stop touch events from scrolling the page
  panel.addEventListener('touchmove', (e) => {
    e.stopPropagation();
  }, { passive: false });

  // Stop click events from reaching the tweet behind
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  return panel;
}

// Create loading badge
function createLoadingBadge(): HTMLElement {
  const badge = document.createElement('div');
  badge.className = 'think-social-badge think-social-loading';
  badge.title = 'Analyzing...';
  
  const spinner = document.createElement('div');
  spinner.className = 'think-social-spinner';
  
  badge.appendChild(spinner);
  
  return badge;
}

// Inject badge into tweet - positioned top-right of the tweet
function injectBadge(article: Element, tweetId: string): HTMLElement | null {
  // Check if badge already exists
  if (article.querySelector('.think-social-badge')) {
    return null;
  }
  
  // Make the article a positioning context for the absolute badge
  (article as HTMLElement).classList.add('think-social-positioned');
  
  // Create loading badge initially
  const badge = createLoadingBadge();
  badge.setAttribute('data-tweet-id', tweetId);
  
  // Append badge directly to the article (top-right via CSS)
  article.appendChild(badge);
  
  return badge;
}

// Update badge with analysis result
function updateBadge(tweetId: string, analysis: AnalysisResult | null, error?: string): void {
  const badge = document.querySelector(`.think-social-badge[data-tweet-id="${tweetId}"]`);
  if (!badge) return;
  
  // Remove loading state
  badge.classList.remove('think-social-loading');
  
  // Cast to HTMLElement for property access
  const badgeEl = badge as HTMLElement;
  
  if (error) {
    // Show error state
    badgeEl.classList.add('think-social-error');
    badgeEl.title = error;
    badgeEl.innerHTML = '<div class="think-social-error-icon">⚠️</div>';
    return;
  }
  
  if (!analysis) return;
  
  // Update badge with rating
  badgeEl.setAttribute('data-rating', analysis.overall);
  badgeEl.title = RATING_LABELS[analysis.overall];
  
  const light = document.createElement('div');
  light.className = 'think-social-light';
  light.style.backgroundColor = COLORS[analysis.overall];
  
  badgeEl.innerHTML = '';
  badgeEl.appendChild(light);
  
  // Create panel and attach to document.body (avoids tweet overflow clipping)
  const panel = createPanel(analysis);
  panel.setAttribute('data-for-tweet', tweetId);
  document.body.appendChild(panel);
  
  // Position and toggle panel on badge click
  badgeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const isVisible = panel.classList.contains('ts-panel-visible');
    
    // Close any other open panel first
    if (activePanel && activePanel !== panel) {
      activePanel.classList.remove('ts-panel-visible');
    }
    
    if (isVisible) {
      panel.classList.remove('ts-panel-visible');
      activePanel = null;
    } else {
      // Position the panel relative to the badge
      const rect = badgeEl.getBoundingClientRect();
      const panelWidth = 340;
      const panelMaxHeight = 520;
      
      // Default: below the badge, right-aligned
      let top = rect.bottom + 8;
      let left = rect.right - panelWidth;
      
      // If panel would go off the left edge, shift right
      if (left < 8) {
        left = 8;
      }
      
      // If panel would go off the bottom, show above the badge instead
      if (top + panelMaxHeight > window.innerHeight) {
        top = rect.top - panelMaxHeight - 8;
        if (top < 8) {
          top = 8; // If still off-screen, just stick to top
        }
      }
      
      panel.style.top = `${top}px`;
      panel.style.left = `${left}px`;
      panel.classList.add('ts-panel-visible');
      activePanel = panel;
    }
  });
  
  // Close panel when clicking elsewhere on the page
  document.addEventListener('click', (e) => {
    if (activePanel && !activePanel.contains(e.target as Node) && !badgeEl.contains(e.target as Node)) {
      activePanel.classList.remove('ts-panel-visible');
      activePanel = null;
    }
  });
}

// Process a single tweet
async function processTweet(article: Element): Promise<void> {
  const tweetId = getTweetId(article);
  if (!tweetId) return;
  
  // Skip if already processed or pending
  if (processedTweets.has(tweetId) || pendingTweets.has(tweetId)) return;
  
  const text = getTweetText(article);
  if (!text || text.length < 10) return; // Skip very short tweets
  
  const author = getTweetAuthor(article);
  
  // Detect all media (video + images) in the tweet
  const media = detectMedia(article);
  
  // Mark as pending
  pendingTweets.add(tweetId);
  
  // Inject loading badge
  const badge = injectBadge(article, tweetId);
  if (!badge) {
    pendingTweets.delete(tweetId);
    return;
  }
  
  // Request analysis from background script
  chrome.runtime.sendMessage(
    {
      type: 'ANALYZE_POST',
      payload: {
        tweetId,
        text,
        author,
        hasVideo: media.hasVideo,
        videoDescription: media.videoDescription,
        videoThumbnailUrl: media.videoThumbnailUrl,
        imageUrls: media.imageUrls
      }
    },
    (response) => {
      pendingTweets.delete(tweetId);
      processedTweets.add(tweetId);
      
      if (response?.payload) {
        updateBadge(tweetId, response.payload.analysis, response.payload.error);
      }
    }
  );
}

// Find and process all visible tweets (resilient to DOM changes)
function processVisibleTweets(): void {
  const articles = findTweetArticles();
  
  articles.forEach(article => {
    processTweet(article);
  });
}

// Set up mutation observer to watch for new tweets
function observeTweets(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
        break;
      }
    }
    
    if (shouldProcess) {
      // Debounce processing
      setTimeout(processVisibleTweets, 100);
    }
  });
  
  // Observe the main content area
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[Inkline] Tweet observer started');
}

// Initialize
function init(): void {
  console.log('[Inkline] Content script loaded');
  
  // Process any existing tweets
  processVisibleTweets();
  
  // Start observing for new tweets
  observeTweets();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
