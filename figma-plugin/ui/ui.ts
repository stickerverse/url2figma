interface ImportOptions {
  createMainFrame: boolean;
  createVariantsFrame: boolean;
  createComponentsFrame: boolean;
  createDesignSystem: boolean;
  applyAutoLayout: boolean;
  createStyles: boolean;
}

let currentData: any = null;

const fileInput = document.getElementById('file-input') as HTMLInputElement;
const pasteBtn = document.getElementById('paste-btn') as HTMLButtonElement;
const importBtn = document.getElementById('import-btn') as HTMLButtonElement;

fileInput?.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        handleDataLoaded(json, file.name);
      } catch (error) {
        showError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }
});

pasteBtn?.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    const json = JSON.parse(text);
    handleDataLoaded(json, 'Clipboard');
  } catch (error) {
    showError('Failed to parse clipboard data. Make sure you copied valid JSON.');
  }
});

importBtn?.addEventListener('click', () => {
  if (!currentData) return;

  const options: ImportOptions = {
    createMainFrame: (document.getElementById('opt-main-frame') as HTMLInputElement).checked,
    createVariantsFrame: (document.getElementById('opt-variants-frame') as HTMLInputElement).checked,
    createComponentsFrame: (document.getElementById('opt-components-frame') as HTMLInputElement).checked,
    createDesignSystem: (document.getElementById('opt-design-system') as HTMLInputElement).checked,
    applyAutoLayout: (document.getElementById('opt-auto-layout') as HTMLInputElement).checked,
    createStyles: (document.getElementById('opt-create-styles') as HTMLInputElement).checked
  };

  showStatus('loading', 'Starting import...');
  
  parent.postMessage({ 
    pluginMessage: { 
      type: 'import', 
      data: currentData,
      options 
    } 
  }, '*');
});

function handleDataLoaded(data: any, source: string) {
  currentData = data;
  
  const fileNameEl = document.getElementById('file-name');
  if (fileNameEl) {
    fileNameEl.textContent = `Loaded: ${source}`;
    fileNameEl.classList.remove('hidden');
  }

  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  if (importBtn) {
    importBtn.disabled = false;
  }

  showStatus('idle', 'Ready to import');
}

function showStatus(type: 'idle' | 'loading' | 'success' | 'error', message: string) {
  ['idle', 'loading', 'success', 'error'].forEach(t => {
    document.getElementById(`status-${t}`)?.classList.add('hidden');
  });
  
  const statusEl = document.getElementById(`status-${type}`);
  if (statusEl) {
    statusEl.classList.remove('hidden');
    const messageEl = statusEl.querySelector('span:last-child') || statusEl;
    if (type === 'loading') {
      const loadingMsg = document.getElementById('loading-message');
      if (loadingMsg) loadingMsg.textContent = message;
    } else {
      messageEl.textContent = message;
    }
  }
}

function showError(message: string) {
  showStatus('error', message);
  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  if (importBtn) {
    importBtn.disabled = false;
  }
}

function updateProgress(percent: number) {
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
}

function showStats(stats: any) {
  const elementsEl = document.getElementById('stat-elements');
  const componentsEl = document.getElementById('stat-components');
  const framesEl = document.getElementById('stat-frames');
  const stylesEl = document.getElementById('stat-styles');
  
  if (elementsEl) elementsEl.textContent = stats.elements || '0';
  if (componentsEl) componentsEl.textContent = stats.components || '0';
  if (framesEl) framesEl.textContent = stats.frames || '0';
  if (stylesEl) stylesEl.textContent = stats.styles || '0';
  
  document.getElementById('stats-section')?.classList.remove('hidden');
}

// Auto-import data receiver
let autoImportEnabled = false;

onmessage = (event) => {
  const msg = event.data.pluginMessage;
  
  switch (msg.type) {
    case 'auto-import-ready':
      autoImportEnabled = true;
      showStatus('loading', 'Ready for automatic data transmission...');
      console.log('🎯 Figma plugin ready for auto-import');
      break;
      
    case 'external-data':
      if (autoImportEnabled && msg.data) {
        console.log('📨 Received external data, auto-importing...');
        handleDataLoaded(msg.data, 'External Transmission');
        // Auto-trigger import with default options
        setTimeout(() => {
          const options: ImportOptions = {
            createMainFrame: true,
            createVariantsFrame: false,
            createComponentsFrame: true,
            createDesignSystem: true,
            applyAutoLayout: true,
            createStyles: true
          };
          
          showStatus('loading', 'Auto-importing...');
          parent.postMessage({ 
            pluginMessage: { 
              type: 'auto-import', 
              data: msg.data,
              options 
            } 
          }, '*');
        }, 1000);
      }
      break;
      
    case 'progress':
      showStatus('loading', msg.message);
      updateProgress(msg.percent);
      break;
    
    case 'complete':
      showStatus('success', `Successfully imported ${msg.stats.elements} elements!`);
      showStats(msg.stats);
      break;
    
    case 'error':
      showError(msg.message);
      break;
  }
};
