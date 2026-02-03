// Think Social - Popup Script

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

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  updateRemaining();
});
