console.log('Web to Figma extension loaded');

const HANDOFF_ENDPOINT = 'http://127.0.0.1:4411/jobs';

interface PendingTransfer {
  chunks: string[];
  totalChunks: number;
  received: number;
}

const pendingTransfers: Map<string, PendingTransfer> = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_SCREENSHOT') {
    if (sender.tab?.id) {
      chrome.tabs.captureVisibleTab(
        sender.tab.windowId,
        { format: 'png' },
        (dataUrl) => {
          sendResponse({ screenshot: dataUrl || '' });
        }
      );
      return true;
    }
  }

  if (message.type === 'TRANSMIT_TO_HANDOFF_INIT') {
    const { messageId, totalChunks } = message as {
      messageId?: string;
      totalChunks?: number;
    };

    if (!messageId || typeof totalChunks !== 'number' || totalChunks <= 0) {
      sendResponse({ ok: false, error: 'Invalid transfer initialisation' });
      return false;
    }

    pendingTransfers.set(messageId, {
      chunks: new Array(totalChunks),
      totalChunks,
      received: 0
    });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'TRANSMIT_TO_HANDOFF_CHUNK') {
    const { messageId, index, chunk } = message as {
      messageId?: string;
      index?: number;
      chunk?: string;
    };

    if (!messageId || typeof index !== 'number' || typeof chunk !== 'string') {
      sendResponse({ ok: false, error: 'Invalid chunk payload' });
      return false;
    }

    const transfer = pendingTransfers.get(messageId);
    if (!transfer) {
      sendResponse({ ok: false, error: 'Unknown transfer' });
      return false;
    }

    if (index < 0 || index >= transfer.totalChunks) {
      sendResponse({ ok: false, error: 'Chunk index out of bounds' });
      return false;
    }

    if (transfer.chunks[index] !== undefined) {
      sendResponse({ ok: false, error: 'Chunk already received' });
      return false;
    }

    transfer.chunks[index] = chunk;
    transfer.received += 1;
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'TRANSMIT_TO_HANDOFF_ABORT') {
    const { messageId } = message as { messageId?: string };
    if (messageId && pendingTransfers.has(messageId)) {
      pendingTransfers.delete(messageId);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'TRANSMIT_TO_HANDOFF_COMMIT') {
    const { messageId } = message as { messageId?: string };
    if (!messageId) {
      sendResponse({ ok: false, error: 'Missing transfer id' });
      return false;
    }

    const transfer = pendingTransfers.get(messageId);
    if (!transfer) {
      sendResponse({ ok: false, error: 'Unknown transfer' });
      return false;
    }

    if (
      transfer.received !== transfer.totalChunks ||
      transfer.chunks.some((chunk) => typeof chunk !== 'string')
    ) {
      sendResponse({ ok: false, error: 'Transfer incomplete' });
      return false;
    }

    const payloadString = transfer.chunks.join('');
    pendingTransfers.delete(messageId);

    (async () => {
      try {
        const payload = JSON.parse(payloadString);
        await postToHandoffServer(payload);
        sendResponse({ ok: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown handoff error';
        console.error('❌ Failed to transmit payload to handoff server:', errorMessage);
        sendResponse({ ok: false, error: errorMessage });
      }
    })();

    return true;
  }

  return false;
});

async function postToHandoffServer(payload: unknown): Promise<void> {
  const response = await fetch(HANDOFF_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }
}
