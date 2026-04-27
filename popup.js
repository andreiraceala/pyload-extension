document.addEventListener('DOMContentLoaded', () => {
  const linkInput = document.getElementById('link-input');
  const addBtn = document.getElementById('add-btn');
  const statusEl = document.getElementById('status');
  const downloadsContainer = document.getElementById('downloads-container');
  const historyContainer = document.getElementById('history-container');
  const openWebuiBtn = document.getElementById('open-webui');
  const openSettingsBtn = document.getElementById('open-settings');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const historyPrevBtn = document.getElementById('history-prev');
  const historyNextBtn = document.getElementById('history-next');
  const paginationText = document.getElementById('pagination-text');

  let serverUrl = '';
  let historyLoaded = false;
  let historyState = {
    offset: 0,
    limit: 50,
    total: 0,
    data: []
  };

  // Load config
  chrome.storage.local.get(['serverUrl', 'lastTab'], (items) => {
    serverUrl = items.serverUrl || '';
    const lastTab = items.lastTab || 'active';
    
    if (!serverUrl) {
      showStatus('Please configure server settings first.', 'error');
    } else {
      updateActiveDownloads();
      setInterval(updateActiveDownloads, 5000); // Update every 5 seconds to reduce background load
      switchToTab(lastTab);
    }
  });

  // Tab Navigation
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchToTab(tabName);
    });
  });

  function switchToTab(tabName) {
    // Update button active state
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update panel visibility
    tabPanels.forEach(panel => panel.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Save preference
    chrome.storage.local.set({ lastTab: tabName });

    // Load history when tab is first opened
    if (tabName === 'history' && !historyLoaded) {
      loadHistoryPage(0);
    }
  }

  // Add Link Button
  addBtn.addEventListener('click', () => {
    const url = linkInput.value.trim();
    if (!url) return;

    addBtn.disabled = true;
    chrome.runtime.sendMessage({ type: 'ADD_LINK', url }, (response) => {
      addBtn.disabled = false;
      if (response && response.success) {
        linkInput.value = '';
        showStatus('Link added successfully!', 'success');
        updateActiveDownloads();
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

  // Pagination Controls
  historyPrevBtn.addEventListener('click', () => {
    if (historyState.offset > 0) {
      loadHistoryPage(historyState.offset - historyState.limit);
    }
  });

  historyNextBtn.addEventListener('click', () => {
    if (historyState.offset + historyState.limit < historyState.total) {
      loadHistoryPage(historyState.offset + historyState.limit);
    }
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

  function updateActiveDownloads() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response && response.success) {
        renderDownloads(response.downloads);
      } else {
        console.warn('Status update failed:', response?.error);
      }
    });
  }

  function loadHistoryPage(offset) {
    historyContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">Loading...</div>';
    
    chrome.runtime.sendMessage(
      { type: 'GET_DOWNLOAD_HISTORY', offset: offset, limit: historyState.limit },
      (response) => {
        if (response && response.success) {
          historyLoaded = true;
          historyState.offset = offset;
          historyState.total = response.total;
          historyState.data = response.data;
          renderHistory(response.data);
          updatePaginationControls();
        } else {
          historyContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">Failed to load history: ${response?.error || 'Unknown error'}</div>`;
        }
      }
    );
  }

  function formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  function getStatusColor(statusCode) {
    const colorMap = {
      0: 'finished',      // Finished
      1: 'offline',       // Offline
      2: 'online',        // Online
      3: 'queued',        // Queued
      4: 'skipped',       // Skipped
      5: 'waiting',       // Waiting
      6: 'starting',      // Starting
      7: 'temp-offline',  // Temp. Offline
      8: 'failed',        // Failed
      9: 'aborted',       // Aborted
      10: 'decrypting',   // Decrypting
      11: 'custom',       // Custom
      12: 'downloading',  // Downloading
      13: 'processing',   // Processing
      14: 'unknown'       // Unknown
    };
    return colorMap[statusCode] || 'unknown';
  }

  function renderDownloads(downloads) {
    if (!downloads || downloads.length === 0) {
      downloadsContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">No active downloads</div>';
      return;
    }

    downloadsContainer.innerHTML = downloads.map(dl => {
      const statusText = STATUS_MAP[dl.status] || dl.statusmsg || 'Unknown';
      const statusClass = getStatusColor(dl.status);
      const speedText = dl.format_speed || formatSpeed(dl.speed);
      const sizeText = dl.format_size || '';

      return `
        <div class="download-item">
          <div class="download-info">
            <span class="download-name" title="${dl.name}">${dl.name}</span>
            <span class="download-status ${statusClass}">${statusText}</span>
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

  function renderHistory(downloads) {
    if (!downloads || downloads.length === 0) {
      historyContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">No downloads in history</div>';
      return;
    }

    historyContainer.innerHTML = downloads.map(dl => {
      const statusText = STATUS_MAP[dl.status] || dl.statusmsg || 'Unknown';
      const statusClass = getStatusColor(dl.status);
      const sizeText = formatSize(dl.size || 0);
      const speedText = dl.format_speed || formatSpeed(dl.speed || 0);
      const dateText = formatDate(dl.added);
      const durationText = dl.speed && dl.size ? formatDuration(dl.size / (dl.speed || 1)) : 'N/A';

      return `
        <div class="download-item">
          <div class="download-info">
            <span class="download-name" title="${dl.name}">${dl.name}</span>
            <span class="download-status ${statusClass}">${statusText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
            <span>${sizeText}</span>
            <span>${speedText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; font-size: 0.7rem; color: var(--text-secondary);">
            <span>Added: ${dateText}</span>
            <span>Duration: ${durationText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function updatePaginationControls() {
    const endIndex = Math.min(historyState.offset + historyState.limit, historyState.total);
    const startIndex = historyState.total === 0 ? 0 : historyState.offset + 1;
    
    paginationText.textContent = `${startIndex}-${endIndex} of ${historyState.total}`;

    historyPrevBtn.disabled = historyState.offset === 0;
    historyNextBtn.disabled = endIndex >= historyState.total;
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
