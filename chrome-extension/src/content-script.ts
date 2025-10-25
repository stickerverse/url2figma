import { StatusOverlay } from './utils/status-overlay';
import { PageScroller } from './utils/page-scroller';

console.log('🌐 Content script loaded');

const overlay = new StatusOverlay();
const scroller = new PageScroller();
let isCapturing = false;
const HANDOFF_CHUNK_SIZE = 250_000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message.type);
  
  if (message.type === 'START_CAPTURE' && !isCapturing) {
    console.log('🚀 Starting capture...');
    isCapturing = true;
    
    handleCapture()
      .then(() => {
        console.log('✅ Capture finished');
      })
      .catch((error) => {
        console.error('❌ Capture failed:', error);
      })
      .finally(() => {
        isCapturing = false;
      });
    
    sendResponse({ started: true });
  }
  return false;
});

async function handleCapture() {
  try {
    console.log('📍 Step 1: Show overlay');
    overlay.show('🔄 Starting capture...');
    await wait(500);

    // Inject script
    console.log('📍 Step 2: Inject script');
    overlay.update('📦 Injecting script...');
    await injectScript();
    await wait(500);

    // Scroll page
    console.log('📍 Step 3: Scroll page');
    overlay.update('📜 Scrolling page...');
    await scroller.scrollPage();
    await wait(500);

    // Capture screenshot
    console.log('📍 Step 4: Capture screenshot');
    overlay.update('📸 Taking screenshot...');
    const screenshot = await captureScreenshot();
    console.log('📸 Screenshot captured:', screenshot ? 'yes' : 'no');
    await wait(500);

    // Extract DOM
    console.log('📍 Step 5: Extract DOM');
    overlay.update('🌳 Extracting page structure...');
    const data = await extractPage(screenshot);
    console.log('🌳 DOM extracted:', data ? 'yes' : 'no');

    // Send to handoff server
    console.log('📍 Step 6: Send to handoff server');
    overlay.update('🚚 Sending data to handoff server...');
    let handoffDelivered = false;
    try {
      await transmitToHandoffServer(data);
      handoffDelivered = true;
      console.log('🛰️ Handoff server acknowledged payload');
      overlay.update('🚚 Data handed off to server');
    } catch (error) {
      console.warn('⚠️ Failed to reach handoff server:', error);
      overlay.update('⚠️ Handoff server unavailable, continuing...');
      chrome.runtime.sendMessage({
        type: 'HANDOFF_ERROR',
        message: error instanceof Error ? error.message : String(error)
      });
    }

    // Send to popup
    console.log('📍 Step 7: Notify popup');
    overlay.update('✅ Data ready for Figma');
    chrome.runtime.sendMessage({
      type: 'CAPTURE_COMPLETE',
      data,
      handoffDelivered
    });

    overlay.update('✅ Capture complete!');
    await wait(2000);
    overlay.hide();

  } catch (error) {
    console.error('❌ Capture failed:', error);
    overlay.update('❌ Capture failed: ' + String(error));
    await wait(3000);
    overlay.hide();
    throw error;
  }
}

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('💉 Creating script element...');
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected-script.js');
    script.onload = () => {
      console.log('✅ Injected script loaded');
      script.remove();
      resolve();
    };
    script.onerror = (error) => {
      console.error('❌ Failed to inject script:', error);
      reject(new Error('Failed to inject script'));
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

async function captureScreenshot(): Promise<string> {
  try {
    console.log('📸 Requesting screenshot...');
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
    console.log('📸 Screenshot response:', response ? 'received' : 'empty');
    return response.screenshot || '';
  } catch (e) {
    console.error('❌ Screenshot failed:', e);
    return '';
  }
}

function extractPage(screenshot: string): Promise<any> {
  return new Promise((resolve, reject) => {
    console.log('🌳 Setting up extraction listener...');
    
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      
      console.log('📨 Received message from injected script:', event.data.type);
      
      if (event.data.type === 'EXTRACTION_COMPLETE') {
        console.log('✅ Extraction complete');
        window.removeEventListener('message', handler);
        resolve(event.data.data);
      } else if (event.data.type === 'EXTRACTION_ERROR') {
        console.error('❌ Extraction error:', event.data.error);
        window.removeEventListener('message', handler);
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', handler);
    
    console.log('📤 Posting START_EXTRACTION message...');
    window.postMessage({
      type: 'START_EXTRACTION',
      screenshot
    }, '*');

    setTimeout(() => {
      console.log('⏰ Extraction timeout');
      window.removeEventListener('message', handler);
      reject(new Error('Extraction timeout'));
    }, 30000);
  });
}

async function transmitToHandoffServer(payload: any): Promise<void> {
  const maxAttempts = 3;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sendPayloadToBackground(payload);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await wait(300 * Math.pow(2, attempt - 1));
      }
    }
  }

    if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Unknown handoff error');
}

async function sendPayloadToBackground(payload: any): Promise<void> {
  const payloadString = JSON.stringify(payload);
  const messageId = `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const totalChunks = Math.max(1, Math.ceil(payloadString.length / HANDOFF_CHUNK_SIZE));

  try {
    const initResponse = await sendBackgroundMessage<{ ok: boolean; error?: string }>({
      type: 'TRANSMIT_TO_HANDOFF_INIT',
      messageId,
      totalChunks
    });
    if (!initResponse.ok) {
      throw new Error(initResponse.error || 'Failed to initialise handoff transfer');
    }

    for (let index = 0; index < totalChunks; index++) {
      const chunk = payloadString.slice(index * HANDOFF_CHUNK_SIZE, (index + 1) * HANDOFF_CHUNK_SIZE);
      const chunkResponse = await sendBackgroundMessage<{ ok: boolean; error?: string }>({
        type: 'TRANSMIT_TO_HANDOFF_CHUNK',
        messageId,
        index,
        chunk
      });
      if (!chunkResponse.ok) {
        throw new Error(chunkResponse.error || `Failed to send chunk ${index + 1}/${totalChunks}`);
      }
    }

    const commitResponse = await sendBackgroundMessage<{ ok: boolean; error?: string }>({
      type: 'TRANSMIT_TO_HANDOFF_COMMIT',
      messageId
    });
    if (!commitResponse.ok) {
      throw new Error(commitResponse.error || 'Handoff transmission failed');
    }
  } catch (error) {
    await sendBackgroundMessage({ type: 'TRANSMIT_TO_HANDOFF_ABORT', messageId }).catch(() => {
      // no-op: best effort cleanup
    });
    throw error;
  }
}

function sendBackgroundMessage<T = { ok: boolean; error?: string }>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      if (!response) {
        reject(new Error('No response from background service worker'));
        return;
      }

      resolve(response);
    });
  });
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
