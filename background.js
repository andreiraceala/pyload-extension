let config = {
  serverUrl: 'https://192.168.0.15',
  apiKey: ''
};

let configPromise = null;

// Initialize config from storage
function loadConfig() {
  configPromise = new Promise((resolve) => {
    chrome.storage.local.get(['serverUrl', 'apiKey'], (items) => {
      config = {
        serverUrl: items.serverUrl || 'https://192.168.0.15',
        apiKey: items.apiKey || ''
      };
      if (config.apiKey) {
        initContextMenus();
        setupKeepAlive();
      }
      resolve(config);
    });
  });
  return configPromise;
}

async function ensureConfig() {
  if (!configPromise) {
    return loadConfig();
  }
  return configPromise;
}

function setupKeepAlive() {
  chrome.alarms.create('keep-alive', { periodInMinutes: 5 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    getPyloadStatus().then(status => {
      console.log('[pyLoad] Keep-alive ping status:', status.success ? 'Success' : 'Failed: ' + status.error);
    });
  }
});

function initContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "add-to-pyload",
      title: "Add to pyLoad",
      contexts: ["link", "image", "audio", "video"]
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  await ensureConfig();
  if (info.menuItemId === "add-to-pyload") {
    const url = info.linkUrl || info.srcUrl;
    if (url) {
      addLinkToPyload(url);
    }
  }
});

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    if (message.type === 'SETTINGS_UPDATED') {
      await loadConfig();
      return { success: true };
    }

    await ensureConfig();

    if (message.type === 'ADD_LINK') {
      return await addLinkToPyload(message.url);
    } else if (message.type === 'GET_STATUS') {
      return await getPyloadStatus();
    } else if (message.type === 'TEST_CONNECTION') {
      return await testConnection(message.serverUrl, message.apiKey);
    }
  };

  handleMessage().then(sendResponse);
  return true; // Keep channel open for async response
});

async function testConnection(serverUrl, apiKey) {
  try {
    const url = `${serverUrl}/api/status_server`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey
      }
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Authentication failed. Please check your API Key.' };
    }

    if (!response.ok) {
      return { success: false, error: `Server returned ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function apiFetch(endpoint, options = {}) {
  if (!config.serverUrl) throw new Error('Server URL not configured');
  if (!config.apiKey) throw new Error('API Key not configured');

  const url = `${config.serverUrl}${endpoint}`;
  const method = options.method || 'GET';

  const defaultOptions = {
    headers: {
      'Accept': 'application/json',
      'X-API-Key': config.apiKey
    }
  };

  const finalOptions = { ...defaultOptions, ...options };
  // Merge headers if provided in options
  if (options.headers) {
    finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
  }

  console.log(`[pyLoad] Fetch Request:`, {
    url: url,
    method: method
  });

  try {
    const response = await fetch(url, finalOptions);

    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication failed. Please check your API Key.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[pyLoad] API Error: ${response.status} ${errorText}`);
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[pyLoad] Network Error: ${error.message}`);
    throw error;
  }
}

async function getPyloadStatus() {
  try {
    const serverStatus = await apiFetch('/api/status_server');
    const downloads = await apiFetch('/api/status_downloads');

    return { success: true, serverStatus, downloads };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addLinkToPyload(linkUrl) {
  try {
    // Extract filename from URL to use as package name
    let fileName = 'Unamed File';
    try {
      const url = new URL(linkUrl);
      const pathname = url.pathname;
      const segments = pathname.split('/').filter(s => s.length > 0);
      if (segments.length > 0) {
        fileName = decodeURIComponent(segments[segments.length - 1]);
      }
    } catch (e) {
      console.warn('[pyLoad] Could not extract filename from URL:', e);
    }

    const response = await apiFetch('/api/add_package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fileName,
        links: [linkUrl],
        dest: 1
      })
    });

    notify('Success', `Added "${fileName}" to pyLoad queue.`);
    return { success: true };
  } catch (error) {
    notify('Error', error.message);
    return { success: false, error: error.message };
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-96.png',
    title: title,
    message: message
  });
}

loadConfig();
