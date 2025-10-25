let capturedData: any = null;

const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const figmaBtn = document.getElementById('figma-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const screenshotImg = document.getElementById('screenshot') as HTMLImageElement;
const screenshotContainer = document.getElementById('screenshot-container') as HTMLDivElement;
const statsEl = document.getElementById('stats') as HTMLDivElement;
const actionsEl = document.getElementById('actions') as HTMLDivElement;
const statElements = document.getElementById('stat-elements') as HTMLSpanElement;
const handoffStatusEl = document.getElementById('handoff-status') as HTMLDivElement;
const previewCard = document.getElementById('preview-card') as HTMLDivElement;
const previewTitleEl = document.getElementById('preview-title') as HTMLSpanElement;
const previewUrlEl = document.getElementById('preview-url') as HTMLSpanElement;
const previewTimestampEl = document.getElementById('preview-timestamp') as HTMLSpanElement;
const openPreviewBtn = document.getElementById('open-preview-btn') as HTMLButtonElement;

console.log('🎨 Popup loaded');

captureBtn.addEventListener('click', async () => {
  console.log('🔵 Capture button clicked');
  
  captureBtn.disabled = true;
  statusEl.textContent = '🔄 Capturing...';
  handoffStatusEl?.classList.add('hidden');
  previewCard?.classList.add('hidden');
  screenshotContainer.classList.add('hidden');
  previewUrlEl.textContent = '';
  previewTimestampEl.textContent = '';
  openPreviewBtn.disabled = true;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('📍 Active tab:', tab.id, tab.url);
    
    if (!tab.id) {
      throw new Error('No active tab');
    }

    if (isRestrictedUrl(tab.url)) {
      throw new Error('Cannot capture internal browser pages. Open a regular website instead.');
    }

    // Inject content script
    console.log('💉 Injecting content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    });
    console.log('✅ Content script injected');

    // Wait a bit for script to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send capture message
    console.log('📤 Sending START_CAPTURE message...');
    chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' }, (response) => {
      console.log('📥 Response from content script:', response);
      if (chrome.runtime.lastError) {
        console.error('❌ Message error:', chrome.runtime.lastError);
        statusEl.textContent = '❌ Failed: ' + chrome.runtime.lastError.message;
        captureBtn.disabled = false;
      }
    });

  } catch (error) {
    console.error('❌ Capture error:', error);
    statusEl.textContent =
      error instanceof Error ? `❌ Failed: ${error.message}` : '❌ Failed to capture';
    captureBtn.disabled = false;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Popup received message:', message.type);

  if (message.type === 'HANDOFF_ERROR') {
    if (handoffStatusEl) {
      handoffStatusEl.textContent = `⚠️ Handoff server unreachable: ${message.message || 'start npm run handoff-server'}`;
      handoffStatusEl.className = 'handoff-status error';
      handoffStatusEl.classList.remove('hidden');
    }
    statusEl.textContent = '⚠️ Server offline, continuing with local capture...';
    return;
  }
  
  if (message.type === 'CAPTURE_COMPLETE') {
    capturedData = message.data;
    
    if (message.handoffDelivered) {
      statusEl.textContent = '✅ Capture delivered to Figma plugin!';
      if (handoffStatusEl) {
        handoffStatusEl.textContent = '🚀 Sent to handoff server for automatic import.';
        handoffStatusEl.className = 'handoff-status success';
        handoffStatusEl.classList.remove('hidden');
      }
    } else {
      statusEl.textContent = '✅ Capture complete. Open Figma to import manually.';
      if (handoffStatusEl) {
        handoffStatusEl.textContent = '⚠️ Handoff server not reached. Use manual import from this popup.';
        handoffStatusEl.className = 'handoff-status error';
        handoffStatusEl.classList.remove('hidden');
      }
    }
    captureBtn.disabled = false;
    
    // Show screenshot
    if (capturedData.screenshot) {
      screenshotImg.src = capturedData.screenshot;
      screenshotContainer.classList.remove('hidden');
      previewCard.classList.remove('hidden');
    }

    updatePreviewMeta(capturedData);
    
    // Show stats
    const count = countElements(capturedData.tree);
    statElements.textContent = count.toString();
    statsEl.classList.remove('hidden');
    
    // Show actions
    actionsEl.classList.remove('hidden');
  }
  
  sendResponse({ received: true });
});

downloadBtn.addEventListener('click', () => {
  console.log('💾 Download clicked');
  if (!capturedData) return;
  
  const blob = new Blob([JSON.stringify(capturedData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `capture-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

figmaBtn.addEventListener('click', async () => {
  console.log('🚀 Send to Figma clicked');
  if (!capturedData) return;
  
  await chrome.storage.local.set({
    figmaImportData: capturedData,
    figmaAutoImport: true,
    figmaImportTimestamp: Date.now()
  });
  
  statusEl.textContent = '✅ Sent to Figma! Open the plugin.';
  console.log('✅ Data sent to Figma storage');
});

openPreviewBtn.addEventListener('click', () => {
  if (!capturedData) return;

  const targetUrl = capturedData.metadata?.url;
  if (targetUrl) {
    chrome.tabs.create({ url: targetUrl });
    return;
  }

  if (capturedData.screenshot) {
    const viewerUrl = capturedData.screenshot;
    chrome.tabs.create({ url: viewerUrl });
  }
});

function countElements(node: any): number {
  if (!node) return 0;
  let count = 1;
  for (const child of node.children || []) {
    count += countElements(child);
  }
  return count;
}

function updatePreviewMeta(data: any) {
  const title = data?.metadata?.title || 'Preview ready';
  const url = data?.metadata?.url || '';
  const timestamp = data?.metadata?.timestamp;
  const canOpen = Boolean(url || data?.screenshot);
  openPreviewBtn.disabled = !canOpen;

  previewTitleEl.textContent = title.length > 60 ? `${title.slice(0, 57)}…` : title;

  if (url) {
    previewUrlEl.textContent = url;
    previewUrlEl.title = url;
  } else {
    previewUrlEl.textContent = '';
    previewUrlEl.title = '';
  }

  if (timestamp) {
    try {
      const formatted = new Date(timestamp).toLocaleString();
      previewTimestampEl.textContent = formatted;
    } catch {
      previewTimestampEl.textContent = '';
    }
  } else {
    previewTimestampEl.textContent = '';
  }
}

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('chrome-extension://')
  );
}
