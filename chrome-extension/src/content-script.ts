import { WebToFigmaSchema, PageMetadata, CaptureOptions, ExtensionMessage, CaptureProgress } from './types/schema';

class ContentScriptController {
  private isCapturing = false;

  constructor() {
    this.initMessageListener();
  }

  private initMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      if (message.type === 'START_CAPTURE') {
        this.handleCaptureRequest(message.data.options);
      }
      return true;
    });
  }

  private async handleCaptureRequest(options: CaptureOptions): Promise<void> {
    if (this.isCapturing) {
      this.sendMessage({ type: 'CAPTURE_ERROR', error: 'Capture already in progress' });
      return;
    }

    this.isCapturing = true;

    try {
      this.sendProgress('Initializing', 0, 100);

      await this.injectExtractionScript();

      this.sendProgress('Analyzing DOM', 20, 100);

      const schema = await this.executeExtraction(options);

      this.sendProgress('Processing assets', 60, 100);

      this.sendProgress('Finalizing', 90, 100);

      this.sendProgress('Complete!', 100, 100);

      this.sendMessage({ 
        type: 'CAPTURE_COMPLETE', 
        data: schema 
      });

    } catch (error) {
      console.error('Capture error:', error);
      this.sendMessage({ 
        type: 'CAPTURE_ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      this.isCapturing = false;
    }
  }

  private async injectExtractionScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('dist/injected-script.js');
      script.onload = () => {
        script.remove();
        resolve();
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Failed to inject extraction script'));
      };
      (document.head || document.documentElement).appendChild(script);
    });
  }

  private async executeExtraction(options: CaptureOptions): Promise<WebToFigmaSchema> {
    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.source !== window) return;
        if (event.data.type === 'WEB_TO_FIGMA_EXTRACTION_COMPLETE') {
          window.removeEventListener('message', messageHandler);
          resolve(event.data.schema);
        } else if (event.data.type === 'WEB_TO_FIGMA_EXTRACTION_ERROR') {
          window.removeEventListener('message', messageHandler);
          reject(new Error(event.data.error));
        } else if (event.data.type === 'WEB_TO_FIGMA_PROGRESS') {
          this.sendProgress(event.data.message, event.data.current, event.data.total);
        }
      };

      window.addEventListener('message', messageHandler);

      window.postMessage({
        type: 'WEB_TO_FIGMA_START_EXTRACTION',
        options
      }, '*');

      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Extraction timeout'));
      }, 60000);
    });
  }

  private sendProgress(message: string, current: number, total: number): void {
    this.sendMessage({
      type: 'PROGRESS_UPDATE',
      data: { message, current, total }
    });
  }

  private sendMessage(message: ExtensionMessage): void {
    chrome.runtime.sendMessage(message);
  }
}

new ContentScriptController();
