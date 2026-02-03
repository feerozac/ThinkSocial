// Think Social - Content Script for Twitter/X
// Detects tweets and injects analysis badges

interface AnalysisResult {
  overall: 'green' | 'amber' | 'red';
  perspective: { rating: 'green' | 'amber' | 'red'; label: string };
  verification: { rating: 'green' | 'amber' | 'red'; label: string };
  balance: { rating: 'green' | 'amber' | 'red'; label: string };
  source: { rating: 'green' | 'amber' | 'red'; label: string };
  tone: { rating: 'green' | 'amber' | 'red'; label: string };
  summary: string;
  confidence: number;
}

// Track processed tweets to avoid duplicates
const processedTweets = new Set<string>();
const pendingTweets = new Set<string>();

// Rating colors
const COLORS = {
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444'
};

// Rating labels for the badge tooltip
const RATING_LABELS = {
  green: 'Multiple sources agree',
  amber: 'Worth a closer look',
  red: 'Dig deeper'
};

// Extract tweet ID from article element
function getTweetId(article: Element): string | null {
  // Try to find the tweet link with status ID
  const link = article.querySelector('a[href*="/status/"]');
  if (link) {
    const href = link.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  
  // Fallback: use data attribute or generate from content
  const timeElement = article.querySelector('time');
  if (timeElement) {
    const parent = timeElement.closest('a');
    const href = parent?.getAttribute('href');
    const match = href?.match(/\/status\/(\d+)/);
    if (match) return match[1];
  }
  
  return null;
}

// Extract tweet text content
function getTweetText(article: Element): string {
  // Twitter's tweet text is in a specific div structure
  const tweetTextDiv = article.querySelector('[data-testid="tweetText"]');
  if (tweetTextDiv) {
    return tweetTextDiv.textContent || '';
  }
  return '';
}

// Extract author username
function getTweetAuthor(article: Element): string {
  // Look for the username in the tweet
  const userNameElement = article.querySelector('[data-testid="User-Name"]');
  if (userNameElement) {
    const usernameSpan = userNameElement.querySelector('a[href^="/"]');
    if (usernameSpan) {
      const href = usernameSpan.getAttribute('href');
      return href?.replace('/', '') || 'unknown';
    }
  }
  return 'unknown';
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
      <span class="ts-signal-label">QUICK SIGNAL:</span>
      <span class="ts-signal-value" data-rating="${analysis.overall}">
        ${ratingEmoji[analysis.overall]} ${RATING_LABELS[analysis.overall]}
      </span>
    </div>
    <div class="ts-panel-divider"></div>
    <div class="ts-panel-section-title">WHAT WE FOUND:</div>
    <div class="ts-panel-dimensions">
      <div class="ts-dimension">
        <span class="ts-dim-name">Perspective</span>
        <span class="ts-dim-rating">${ratingEmoji[analysis.perspective.rating]}</span>
        <span class="ts-dim-label">${analysis.perspective.label}</span>
      </div>
      <div class="ts-dimension">
        <span class="ts-dim-name">Verification</span>
        <span class="ts-dim-rating">${ratingEmoji[analysis.verification.rating]}</span>
        <span class="ts-dim-label">${analysis.verification.label}</span>
      </div>
      <div class="ts-dimension">
        <span class="ts-dim-name">Other Views</span>
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
      <div class="ts-summary-title">THE FULL PICTURE:</div>
      <div class="ts-summary-text">${analysis.summary}</div>
    </div>
    <div class="ts-panel-footer">
      <span class="ts-confidence">Confidence: ${Math.round(analysis.confidence * 100)}%</span>
    </div>
  `;
  
  // Add close button handler
  const closeBtn = panel.querySelector('.ts-panel-close');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.remove('ts-panel-visible');
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

// Inject badge into tweet
function injectBadge(article: Element, tweetId: string): HTMLElement | null {
  // Check if badge already exists
  if (article.querySelector('.think-social-badge')) {
    return null;
  }
  
  // Find the actions bar (like, retweet, etc.)
  const actionsBar = article.querySelector('[role="group"]');
  if (!actionsBar) return null;
  
  // Create loading badge initially
  const badge = createLoadingBadge();
  badge.setAttribute('data-tweet-id', tweetId);
  
  // Insert badge at the beginning of actions bar
  actionsBar.insertBefore(badge, actionsBar.firstChild);
  
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
  
  // Create and attach panel
  const panel = createPanel(analysis);
  badgeEl.appendChild(panel);
  
  // Add click handler to toggle panel
  badgeEl.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    panel.classList.toggle('ts-panel-visible');
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
      payload: { tweetId, text, author }
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

// Find and process all visible tweets
function processVisibleTweets(): void {
  // Twitter uses article elements for tweets
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  
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
  
  console.log('[Think Social] Tweet observer started');
}

// Initialize
function init(): void {
  console.log('[Think Social] Content script loaded');
  
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
