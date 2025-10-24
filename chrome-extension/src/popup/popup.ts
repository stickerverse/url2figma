import { WebToFigmaSchema, CaptureOptions, ExtensionMessage } from '../types/schema';

class PopupController {
  private captureBtn: HTMLButtonElement;
  private copyJsonBtn: HTMLButtonElement;
  private downloadJsonBtn: HTMLButtonElement;
  private sendToFigmaBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  
  private capturedData: WebToFigmaSchema | null = null;
  private startTime: number = 0;

  constructor() {
    this.captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
    this.copyJsonBtn = document.getElementById('copy-json-btn') as HTMLButtonElement;
    this.downloadJsonBtn = document.getElementById('download-json-btn') as HTMLButtonElement;
    this.sendToFigmaBtn = document.getElementById('send-to-figma-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    this.initEventListeners();
    this.loadCurrentPageInfo();
  }

  private initEventListeners(): void {
    this.captureBtn.addEventListener('click', () => this.startCapture());
    this.copyJsonBtn.addEventListener('click', () => this.copyJSON());
    this.downloadJsonBtn.addEventListener('click', () => this.downloadJSON());
    this.sendToFigmaBtn.addEventListener('click', () => this.sendToFigma());
    this.resetBtn.addEventListener('click', () => this.reset());

    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      this.handleMessage(message);
    });
  }

  private async loadCurrentPageInfo(): Promise<void> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      (document.getElementById('debug-url') as HTMLElement).textContent = tab.url || '';
      (document.getElementById('debug-title') as HTMLElement).textContent = tab.title || '';
    }
  }

  private async startCapture(): Promise<void> {
    this.startTime = Date.now();
    this.showStatus('capturing');
    this.captureBtn.disabled = true;

    const options = this.getCaptureOptions();

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      await this.injectContentScript(tab.id);

      chrome.tabs.sendMessage(tab.id, {
        type: 'START_CAPTURE',
        data: { options }
      });

    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Unknown error');
      this.captureBtn.disabled = false;
    }
  }

  private async injectContentScript(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['dist/content-script.js']
      });
    } catch (error) {
      console.log('Content script already injected or injection failed:', error);
    }
  }

  private getCaptureOptions(): CaptureOptions {
    const viewports = [];
    
    if ((document.getElementById('viewport-mobile') as HTMLInputElement).checked) {
      viewports.push({ name: 'Mobile', width: 375, height: 667 });
    }
    if ((document.getElementById('viewport-tablet') as HTMLInputElement).checked) {
      viewports.push({ name: 'Tablet', width: 768, height: 1024 });
    }
    if ((document.getElementById('viewport-desktop') as HTMLInputElement).checked) {
      viewports.push({ name: 'Desktop', width: 1440, height: 900 });
    }

    return {
      captureHoverStates: (document.getElementById('capture-hover') as HTMLInputElement).checked,
      captureFocusStates: (document.getElementById('capture-focus') as HTMLInputElement).checked,
      detectComponents: (document.getElementById('detect-components') as HTMLInputElement).checked,
      extractSVGs: (document.getElementById('extract-svgs') as HTMLInputElement).checked,
      captureDepth: (document.getElementById('capture-depth') as HTMLSelectElement).value as any,
      viewports,
      createVariantsFrame: (document.getElementById('create-variants-frame') as HTMLInputElement).checked,
      pixelPerfectMode: true
    };
  }

  private handleMessage(message: ExtensionMessage): void {
    switch (message.type) {
      case 'PROGRESS_UPDATE':
        this.updateProgress(message.data);
        break;
      
      case 'CAPTURE_COMPLETE':
        this.handleCaptureComplete(message.data);
        break;
      
      case 'CAPTURE_ERROR':
        this.showError(message.error || 'Unknown error');
        this.captureBtn.disabled = false;
        break;
    }
  }

  private updateProgress(progress: any): void {
    const progressText = document.getElementById('capture-progress') as HTMLElement;
    const progressFill = document.getElementById('progress-fill') as HTMLElement;
    
    progressText.textContent = progress.message;
    const percentage = (progress.current / progress.total) * 100;
    progressFill.style.width = `${percentage}%`;
  }

  private async handleCaptureComplete(data: WebToFigmaSchema): Promise<void> {
    this.capturedData = data;
    const processingTime = Date.now() - this.startTime;

    await this.processWithYoga(data);

    this.showStatus('success');
    
    const stats = this.calculateStats(data);
    (document.getElementById('success-stats') as HTMLElement).textContent = 
      `${stats.elements} elements, ${stats.components} components`;

    this.displayStats(stats);

    (document.getElementById('debug-viewport') as HTMLElement).textContent = 
      `${data.metadata.viewport.width}x${data.metadata.viewport.height}`;
    (document.getElementById('debug-time') as HTMLElement).textContent = 
      `${(processingTime / 1000).toFixed(2)}s`;
    (document.getElementById('debug-size') as HTMLElement).textContent = 
      this.formatBytes(JSON.stringify(data).length);

    this.showActionButtons();
    this.captureBtn.disabled = false;
  }

  private async processWithYoga(data: WebToFigmaSchema): Promise<void> {
    const serverEndpoint = (document.getElementById('server-endpoint') as HTMLInputElement).value;
    
    if (!serverEndpoint) {
      console.warn('No server endpoint configured, skipping Yoga processing');
      return;
    }

    try {
      const response = await fetch(serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const processedData = await response.json();
      
      if (processedData.ok && processedData.tree) {
        this.capturedData = {
          ...data,
          tree: processedData.tree,
          yogaLayout: processedData.yogaLayout
        };
      }
    } catch (error) {
      console.warn('Yoga processing failed, using original data:', error);
    }
  }

  private calculateStats(data: WebToFigmaSchema): any {
    let elements = 0;
    let images = 0;
    let svgs = 0;

    const countElements = (node: any) => {
      elements++;
      if (node.type === 'IMAGE') images++;
      if (node.type === 'VECTOR') svgs++;
      if (node.children) {
        node.children.forEach(countElements);
      }
    };

    countElements(data.tree);

    return {
      elements,
      components: Object.keys(data.components?.components || {}).length,
      images: Object.keys(data.assets.images).length,
      svgs: Object.keys(data.assets.svgs).length
    };
  }

  private displayStats(stats: any): void {
    (document.getElementById('stat-elements') as HTMLElement).textContent = stats.elements;
    (document.getElementById('stat-components') as HTMLElement).textContent = stats.components;
    (document.getElementById('stat-images') as HTMLElement).textContent = stats.images;
    (document.getElementById('stat-svgs') as HTMLElement).textContent = stats.svgs;
    
    document.getElementById('results-section')?.classList.remove('hidden');
  }

  private showActionButtons(): void {
    this.copyJsonBtn.classList.remove('hidden');
    this.downloadJsonBtn.classList.remove('hidden');
    this.sendToFigmaBtn.classList.remove('hidden');
    this.resetBtn.classList.remove('hidden');
  }

  private async copyJSON(): Promise<void> {
    if (!this.capturedData) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(this.capturedData, null, 2));
      this.showNotification('✓ JSON copied to clipboard!');
    } catch (error) {
      this.showNotification('✗ Failed to copy JSON', true);
    }
  }

  private downloadJSON(): void {
    if (!this.capturedData) return;

    const blob = new Blob([JSON.stringify(this.capturedData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `web-to-figma-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('✓ JSON file downloaded!');
  }

  private async sendToFigma(): Promise<void> {
    if (!this.capturedData) return;

    await chrome.storage.local.set({ 
      'figmaImportData': this.capturedData,
      'figmaImportTimestamp': Date.now()
    });

    this.showNotification('✓ Data ready for Figma plugin!\nOpen your Figma plugin to import.');
  }

  private reset(): void {
    this.capturedData = null;
    this.showStatus('ready');
    this.copyJsonBtn.classList.add('hidden');
    this.downloadJsonBtn.classList.add('hidden');
    this.sendToFigmaBtn.classList.add('hidden');
    this.resetBtn.classList.add('hidden');
    document.getElementById('results-section')?.classList.add('hidden');
  }

  private showStatus(status: 'ready' | 'capturing' | 'success' | 'error'): void {
    ['ready', 'capturing', 'success', 'error'].forEach(s => {
      document.getElementById(`status-${s}`)?.classList.add('hidden');
    });
    document.getElementById(`status-${status}`)?.classList.remove('hidden');
  }

  private showError(message: string): void {
    this.showStatus('error');
    (document.getElementById('error-message') as HTMLElement).textContent = message;
  }

  private showNotification(message: string, isError = false): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      background: ${isError ? '#ef4444' : '#10b981'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 10000;
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}

new PopupController();
