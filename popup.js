document.addEventListener('DOMContentLoaded', () => {
  const linkInput = document.getElementById('link-input');
  const addBtn = document.getElementById('add-btn');
  const statusEl = document.getElementById('status');
  const downloadsContainer = document.getElementById('downloads-container');
  const openWebuiBtn = document.getElementById('open-webui');
  const openSettingsBtn = document.getElementById('open-settings');

  let serverUrl = '';

  // Load config
  chrome.storage.local.get(['serverUrl'], (items) => {
    serverUrl = items.serverUrl || '';
    if (!serverUrl) {
      showStatus('Please configure server settings first.', 'error');
    } else {
      updateStatus();
      setInterval(updateStatus, 5000); // Update every 5 seconds to reduce background load
    }
  });

  addBtn.addEventListener('click', () => {
    const url = linkInput.value.trim();
    if (!url) return;

    addBtn.disabled = true;
    chrome.runtime.sendMessage({ type: 'ADD_LINK', url }, (response) => {
      addBtn.disabled = false;
      if (response && response.success) {
        linkInput.value = '';
        showStatus('Link added successfully!', 'success');
        updateStatus();
      } else {
        showStatus(response?.error || 'Failed to add link', 'error');
      }
    });
  });

  openWebuiBtn.addEventListener('click', () => {
    if (serverUrl) {
      chrome.tabs.create({ url: serverUrl });
    } else {
      chrome.runtime.openOptionsPage();
    }
  });

  openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  const STATUS_MAP = {
    0: 'Finished',
    1: 'Offline',
    2: 'Online',
    3: 'Queued',
    4: 'Skipped',
    5: 'Waiting',
    6: 'Starting',
    7: 'Temp. Offline',
    8: 'Failed',
    9: 'Aborted',
    10: 'Decrypting',
    11: 'Custom',
    12: 'Downloading',
    13: 'Processing',
    14: 'Unknown'
  };

  function updateStatus() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response && response.success) {
        renderDownloads(response.downloads);
      } else {
        console.warn('Status update failed:', response?.error);
      }
    });
  }

  function formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function renderDownloads(downloads) {
    if (!downloads || downloads.length === 0) {
      downloadsContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">No active downloads</div>';
      return;
    }

    downloadsContainer.innerHTML = downloads.map(dl => {
      const statusText = STATUS_MAP[dl.status] || dl.statusmsg || 'Unknown';
      const speedText = dl.format_speed || formatSpeed(dl.speed);
      const sizeText = dl.format_size || '';

      return `
        <div class="download-item">
          <div class="download-info">
            <span class="download-name" title="${dl.name}">${dl.name}</span>
            <span class="download-status ${statusText.toLowerCase().replace(/[^a-z0-9]/g, '-')}">${statusText}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${dl.percent || 0}%"></div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
            <span>${sizeText}</span>
            <span>${speedText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status-msg ${type}`;
    statusEl.style.display = 'block';
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
});
