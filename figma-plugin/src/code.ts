import uiHtml from '../ui/index.html';
import { FigmaImporter, ImportOptions } from './importer';

figma.showUI(uiHtml, { width: 400, height: 600 });

const defaultImportOptions: ImportOptions = {
  createMainFrame: true,
  createVariantsFrame: false,
  createComponentsFrame: true,
  createDesignSystem: false,
  applyAutoLayout: true,
  createStyles: true
};

let isImporting = false;

figma.on('run', (runEvent) => {
  if (runEvent.command === 'auto-import') {
    figma.ui.postMessage({ type: 'auto-import-ready' });
  }
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'puppeteer-start-live-mode') {
    figma.ui.postMessage({ type: 'puppeteer-control-start' });
    return;
  }

  if (msg.type === 'import' || msg.type === 'auto-import' || msg.type === 'live-import') {
    await handleImportRequest(msg.data, msg.options, msg.type);
  }
};

async function handleImportRequest(
  schema: any,
  options: Partial<ImportOptions> | undefined,
  trigger: 'import' | 'auto-import' | 'live-import'
): Promise<void> {
  if (!schema) {
    figma.ui.postMessage({ type: 'error', message: 'No schema payload received.' });
    return;
  }

  if (isImporting) {
    figma.ui.postMessage({
      type: 'import-busy',
      message: 'An import is already running. Please wait for it to finish.'
    });
    return;
  }

  isImporting = true;

  const resolvedOptions: ImportOptions = {
    ...defaultImportOptions,
    ...(options || {})
  };

  try {
    figma.ui.postMessage({
      type: 'progress',
      message: 'Preparing Figma canvas...',
      percent: 5
    });

    const importer = new FigmaImporter(schema, resolvedOptions);
    await importer.run();

    const stats = importer.getStats();
    const enhancedStats = {
      ...stats,
      designTokens: schema.designTokens
        ? {
            colors: Object.keys(schema.designTokens.colors || {}).length,
            typography: Object.keys(schema.designTokens.typography || {}).length,
            spacing: Object.keys(schema.designTokens.spacing || {}).length,
            shadows: Object.keys(schema.designTokens.shadows || {}).length,
            borderRadius: Object.keys(schema.designTokens.borderRadius || {}).length
          }
        : null,
      extraction: schema.metadata?.extractionSummary
    };

    figma.ui.postMessage({ type: 'complete', stats: enhancedStats });
    figma.notify('✓ Import complete', { timeout: 3000 });
    postHandoffStatus('waiting');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Import failed. See console for details.';
    figma.ui.postMessage({ type: 'error', message });
    figma.notify(`✗ Import failed: ${message}`, { error: true });
    postHandoffStatus('error', message);
  } finally {
    isImporting = false;
  }
}

function postHandoffStatus(status: HandoffStatus, detail?: string, meta?: Record<string, any>) {
  if (status === lastHandoffStatus && status !== 'job-ready') {
    return;
  }

  lastHandoffStatus = status;
  figma.ui.postMessage({ type: 'handoff-status', status, detail, meta });
}

function startHandoffPolling(): void {
  if (handoffPollingHandle) return;

  handoffPollingHandle = setInterval(() => {
    pollHandoffServer().catch((err) => {
      console.warn('Handoff polling error:', err);
    });
  }, HANDOFF_POLL_INTERVAL);

  pollHandoffServer().catch((err) => {
    console.warn('Initial handoff polling error:', err);
  });
}

function stopHandoffPolling(): void {
  if (handoffPollingHandle) {
    clearInterval(handoffPollingHandle);
    handoffPollingHandle = null;
  }
}

async function pollHandoffServer(): Promise<void> {
  if (isImporting) return;

  const fetchFn = (globalThis as any).fetch as undefined | typeof fetch;
  if (!fetchFn) {
    if (!fetchUnavailableNotified) {
      fetchUnavailableNotified = true;
      postHandoffStatus('error', 'Fetch API is unavailable inside the Figma runtime.');
    }
    updateChromeConnection('disconnected');
    updateServerConnection('disconnected');
    return;
  }

  try {
    const response = await fetchFn(HANDOFF_ENDPOINT, {
      method: 'GET',
      headers: { 'cache-control': 'no-cache' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();
    consecutiveHandoffFailures = 0;
    updateChromeConnection('connected');
    updateServerConnection('connected');

    if (body?.job?.payload) {
      postHandoffStatus('job-ready', undefined, {
        jobId: body.job.id,
        timestamp: body.job.timestamp
      });
      figma.ui.postMessage({ type: 'data-receiving' });
      figma.ui.postMessage({
        type: 'auto-import-data',
        data: body.job.payload,
        meta: {
          jobId: body.job.id,
          timestamp: body.job.timestamp
        }
      });
    } else {
      postHandoffStatus('waiting');
    }
  } catch (error) {
    consecutiveHandoffFailures += 1;
    const message =
      error instanceof Error ? error.message : 'Unknown handoff polling error.';

    if (consecutiveHandoffFailures === 1 || consecutiveHandoffFailures % 5 === 0) {
      postHandoffStatus('error', message);
    }
    updateChromeConnection('disconnected');
    updateServerConnection('disconnected');
  }
}

function updateChromeConnection(state: 'connected' | 'disconnected') {
  if (state === chromeConnectionState) return;
  chromeConnectionState = state;

  figma.ui.postMessage({
    type: state === 'connected' ? 'chrome-extension-connected' : 'chrome-extension-disconnected'
  });
}

function updateServerConnection(state: 'connected' | 'disconnected') {
  if (state === serverConnectionState) return;
  serverConnectionState = state;

  figma.ui.postMessage({
    type: state === 'connected' ? 'server-connected' : 'server-disconnected'
  });
}
