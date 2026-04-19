document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('server-url');
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const status = document.getElementById('status');

  // Load existing settings
  chrome.storage.local.get(['serverUrl', 'apiKey'], (items) => {
    if (items.serverUrl) serverUrlInput.value = items.serverUrl;
    if (items.apiKey) apiKeyInput.value = items.apiKey;
  });

  saveBtn.addEventListener('click', () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/$/, ""); // Remove trailing slash
    const apiKey = apiKeyInput.value.trim();

    if (!serverUrl) {
      showStatus('Please enter a server URL', 'error');
      return;
    }

    if (!apiKey) {
      showStatus('Please enter an API Key', 'error');
      return;
    }

    chrome.storage.local.set({ serverUrl, apiKey }, () => {
      showStatus('Settings saved successfully!', 'success');
      
      // Notify background script to re-init
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  });

  const testBtn = document.getElementById('test-btn');
  testBtn.addEventListener('click', () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/$/, "");
    const apiKey = apiKeyInput.value.trim();

    if (!serverUrl || !apiKey) {
      showStatus('Please enter both URL and API Key', 'error');
      return;
    }

    testBtn.disabled = true;
    showStatus('Testing connection...', 'success');

    chrome.runtime.sendMessage({ 
      type: 'TEST_CONNECTION', 
      serverUrl, 
      apiKey 
    }, (response) => {
      testBtn.disabled = false;
      if (response && response.success) {
        showStatus('Connection Successful!', 'success');
      } else {
        showStatus(response?.error || 'Connection Failed', 'error');
      }
    });
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status-msg ${type}`;
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
});
