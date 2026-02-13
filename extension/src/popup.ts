// Inkline - Popup Script

// Get remaining requests count and update display
async function updateRemaining(): Promise<void> {
  const remainingEl = document.getElementById('remaining');
  if (!remainingEl) return;
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_REMAINING' });
    remainingEl.textContent = response?.remaining?.toString() || '--';
  } catch (error) {
    console.error('Error getting remaining count:', error);
    remainingEl.textContent = '--';
  }
}

// Detect which platform the active tab is on and update status text
async function updatePlatformStatus(): Promise<void> {
  const statusEl = document.getElementById('platform-status');
  if (!statusEl) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';
    
    const platforms: string[] = [];
    if (url.includes('twitter.com') || url.includes('x.com')) platforms.push('Twitter/X');
    else if (url.includes('facebook.com')) platforms.push('Facebook');
    else if (url.includes('instagram.com')) platforms.push('Instagram');
    
    if (platforms.length > 0) {
      statusEl.textContent = `Active on ${platforms.join(', ')}`;
    } else {
      statusEl.textContent = 'Works on Twitter/X, Facebook & Instagram';
    }
  } catch {
    statusEl.textContent = 'Works on Twitter/X, Facebook & Instagram';
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  updateRemaining();
  updatePlatformStatus();
});
