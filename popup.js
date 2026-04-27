document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const downloadsContainer = document.getElementById('downloads-container');
  const queueContainer = document.getElementById('queue-container');
  const openWebuiBtn = document.getElementById('open-webui');
  const openSettingsBtn = document.getElementById('open-settings');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const queuePrevBtn = document.getElementById('queue-prev');
  const queueNextBtn = document.getElementById('queue-next');
  const paginationText = document.getElementById('pagination-text');
  const cleanFinishedBtn = document.getElementById('clean-finished-btn');

  let serverUrl = '';
  let queueLoaded = false;
  let queueState = {
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

    // Load queue when tab is first opened
    if (tabName === 'queue' && !queueLoaded) {
      loadQueuePage(0);
    }
  }


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
  queuePrevBtn.addEventListener('click', () => {
    if (queueState.offset > 0) {
      loadQueuePage(queueState.offset - queueState.limit);
    }
  });

  queueNextBtn.addEventListener('click', () => {
    if (queueState.offset + queueState.limit < queueState.total) {
      loadQueuePage(queueState.offset + queueState.limit);
    }
  });

  cleanFinishedBtn.addEventListener('click', () => {
    cleanFinishedBtn.disabled = true;
    chrome.runtime.sendMessage({ type: 'DELETE_FINISHED' }, (response) => {
      cleanFinishedBtn.disabled = false;
      if (response && response.success) {
        showStatus('Finished downloads removed', 'success');
        loadQueuePage(queueState.offset);
      } else {
        showStatus(response?.error || 'Failed to remove finished downloads', 'error');
      }
    });
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

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  function setMessageContent(container, message) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0;"></div>';
    container.querySelector('div').textContent = message;
  }

  function updateActiveDownloads() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response && response.success) {
        renderDownloads(response.downloads);
      } else {
        console.warn('Status update failed:', response?.error);
      }
    });
  }

  function loadQueuePage(offset) {
    setMessageContent(queueContainer, 'Loading...');
    
    chrome.runtime.sendMessage(
      { type: 'GET_QUEUE', offset: offset, limit: queueState.limit },
      (response) => {
        if (response && response.success) {
          queueLoaded = true;
          queueState.offset = offset;
          queueState.total = response.total;
          queueState.data = response.data;
          renderQueue(response.data);
          updatePaginationControls();
        } else {
          setMessageContent(queueContainer, `Failed to load queue: ${response?.error || 'Unknown error'}`);
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
    downloadsContainer.innerHTML = ''; // Clear existing
    if (!downloads || downloads.length === 0) {
      setMessageContent(downloadsContainer, 'No active downloads');
      return;
    }

    downloads.forEach(dl => {
      const statusText = STATUS_MAP[dl.status] || dl.statusmsg || 'Unknown';
      const statusClass = getStatusColor(dl.status);
      const speedText = dl.format_speed || formatSpeed(dl.speed);
      const sizeText = dl.format_size || '';

      const dlItem = document.createElement('div');
      dlItem.className = 'download-item';

      const dlInfo = document.createElement('div');
      dlInfo.className = 'download-info';

      const dlName = document.createElement('span');
      dlName.className = 'download-name';
      dlName.textContent = dl.name;
      dlName.title = dl.name;

      const dlStatus = document.createElement('span');
      dlStatus.className = `download-status ${statusClass}`;
      dlStatus.textContent = statusText;

      dlInfo.appendChild(dlName);
      dlInfo.appendChild(dlStatus);

      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-bar';

      const progressFill = document.createElement('div');
      progressFill.className = 'progress-fill';
      progressFill.style.width = `${dl.percent || 0}%`;

      progressContainer.appendChild(progressFill);

      const stats = document.createElement('div');
      stats.style.display = 'flex';
      stats.style.justifyContent = 'space-between';
      stats.style.marginTop = '0.5rem';
      stats.style.fontSize = '0.75rem';
      stats.style.color = 'var(--text-secondary)';

      const sizeSpan = document.createElement('span');
      sizeSpan.textContent = sizeText;

      const speedSpan = document.createElement('span');
      speedSpan.textContent = speedText;

      stats.appendChild(sizeSpan);
      stats.appendChild(speedSpan);

      dlItem.appendChild(dlInfo);
      dlItem.appendChild(progressContainer);
      dlItem.appendChild(stats);

      downloadsContainer.appendChild(dlItem);
    });
  }

  function renderQueue(packages) {
    queueContainer.innerHTML = ''; // Clear existing
    if (!packages || packages.length === 0) {
      setMessageContent(queueContainer, 'No packages in queue');
      return;
    }

    packages.forEach(pkg => {
      const sizeText = pkg.sizetotal ? formatSize(pkg.sizetotal) : 'Unknown size';
      const doneText = pkg.sizedone ? formatSize(pkg.sizedone) : '0 B';
      const linksText = `${pkg.linksdone || 0} / ${pkg.linkstotal || 0} links`;
      const progress = pkg.sizetotal ? Math.round((pkg.sizedone / pkg.sizetotal) * 100) : 0;

      const pkgItem = document.createElement('div');
      pkgItem.className = 'download-item';
      pkgItem.dataset.pid = pkg.pid;

      const pkgInfo = document.createElement('div');
      pkgInfo.className = 'download-info';

      const pkgName = document.createElement('span');
      pkgName.className = 'download-name';
      pkgName.textContent = pkg.name;
      pkgName.title = pkg.name;

      const pkgActions = document.createElement('div');
      pkgActions.style.display = 'flex';
      pkgActions.style.gap = '0.5rem';
      pkgActions.style.alignItems = 'center';

      const restartBtn = document.createElement('button');
      restartBtn.className = 'btn-restart';
      restartBtn.dataset.pid = pkg.pid;
      restartBtn.textContent = 'Restart';

      const pkgStatus = document.createElement('span');
      pkgStatus.className = 'download-status queued';
      pkgStatus.textContent = linksText;

      pkgActions.appendChild(restartBtn);
      pkgActions.appendChild(pkgStatus);

      pkgInfo.appendChild(pkgName);
      pkgInfo.appendChild(pkgActions);

      const progressContainer = document.createElement('div');
      progressContainer.className = 'progress-bar';

      const progressFill = document.createElement('div');
      progressFill.className = 'progress-fill';
      progressFill.style.width = `${progress}%`;

      progressContainer.appendChild(progressFill);

      const stats = document.createElement('div');
      stats.style.display = 'flex';
      stats.style.justifyContent = 'space-between';
      stats.style.marginTop = '0.5rem';
      stats.style.fontSize = '0.75rem';
      stats.style.color = 'var(--text-secondary)';

      const doneSpan = document.createElement('span');
      doneSpan.textContent = `${doneText} / ${sizeText}`;

      const progressSpan = document.createElement('span');
      progressSpan.textContent = `${progress}%`;

      stats.appendChild(doneSpan);
      stats.appendChild(progressSpan);

      pkgItem.appendChild(pkgInfo);
      pkgItem.appendChild(progressContainer);
      pkgItem.appendChild(stats);

      queueContainer.appendChild(pkgItem);
    });

    // Add event listeners for restart buttons
    queueContainer.querySelectorAll('.btn-restart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.dataset.pid;
        btn.disabled = true;
        btn.textContent = '...';
        
        chrome.runtime.sendMessage({ type: 'RESTART_PACKAGE', pid }, (response) => {
          if (response && response.success) {
            showStatus('Package restarted', 'success');
            loadQueuePage(queueState.offset);
          } else {
            btn.disabled = false;
            btn.textContent = 'Restart';
            showStatus(response?.error || 'Failed to restart package', 'error');
          }
        });
      });
    });
  }

  function updatePaginationControls() {
    const endIndex = Math.min(queueState.offset + queueState.limit, queueState.total);
    const startIndex = queueState.total === 0 ? 0 : queueState.offset + 1;
    
    paginationText.textContent = `${startIndex}-${endIndex} of ${queueState.total}`;

    queuePrevBtn.disabled = queueState.offset === 0;
    queueNextBtn.disabled = endIndex >= queueState.total;
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
