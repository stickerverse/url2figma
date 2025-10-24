import { DOMExtractor } from './utils/dom-extractor';
import { ComponentDetector } from './utils/component-detector';
import { StateCapturer } from './utils/state-capturer';
import { VariantsCollector } from './utils/variants-collector';
import { WebToFigmaSchema, CaptureOptions, PageMetadata, FontDefinition } from './types/schema';

class PageExtractor {
  private extractor: DOMExtractor;
  private componentDetector: ComponentDetector;
  private stateCapturer: StateCapturer;
  private variantsCollector: VariantsCollector;

  constructor() {
    this.extractor = new DOMExtractor();
    this.componentDetector = new ComponentDetector();
    this.stateCapturer = new StateCapturer();
    this.variantsCollector = new VariantsCollector();
    this.initMessageListener();
  }

  private initMessageListener(): void {
    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;
      if (event.data.type === 'WEB_TO_FIGMA_START_EXTRACTION') {
        await this.performExtraction(event.data.options);
      }
    });
  }

  private async performExtraction(options: CaptureOptions): Promise<void> {
    try {
      this.sendProgress('Preparing page', 0, 100);

      await this.ensurePageReady();

      this.sendProgress('Extracting DOM tree', 10, 100);

      const tree = await this.extractor.extractElement(document.body);

      if (!tree) {
        throw new Error('Failed to extract page structure');
      }

      this.sendProgress('Detecting components', 40, 100);

      let componentRegistry = this.extractor.getComponentRegistry();
      if (options.detectComponents) {
        componentRegistry = this.componentDetector.detectComponents(tree);
      }

      this.sendProgress('Collecting interactive variants', 60, 100);

      const variants = options.createVariantsFrame 
        ? await this.variantsCollector.collectVariants(tree)
        : { elements: {} };

      this.sendProgress('Collecting fonts', 80, 100);

      const fonts = await this.extractFonts();

      this.sendProgress('Building schema', 90, 100);

      const schema: WebToFigmaSchema = {
        version: '1.0.0',
        metadata: this.buildMetadata(options, fonts),
        tree,
        assets: this.extractor.getAssetRegistry(),
        styles: this.extractor.getStyleRegistry(),
        components: componentRegistry,
        variants
      };

      this.sendProgress('Complete', 100, 100);

      window.postMessage({
        type: 'WEB_TO_FIGMA_EXTRACTION_COMPLETE',
        schema
      }, '*');

    } catch (error) {
      console.error('Extraction error:', error);
      window.postMessage({
        type: 'WEB_TO_FIGMA_EXTRACTION_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, '*');
    }
  }

  private async ensurePageReady(): Promise<void> {
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }

    const images = Array.from(document.images);
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      })
    );

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async extractFonts(): Promise<FontDefinition[]> {
    const fonts = new Set<string>();
    const fontDefinitions: FontDefinition[] = [];

    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      const computed = window.getComputedStyle(element);
      const fontFamily = computed.fontFamily;
      if (fontFamily) {
        const families = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
        families.forEach(family => fonts.add(family));
      }
    });

    for (const family of fonts) {
      const isGoogleFont = this.isGoogleFont(family);
      
      fontDefinitions.push({
        family,
        weights: [400, 700],
        source: isGoogleFont ? 'google' : 'system',
        url: isGoogleFont ? `https://fonts.google.com/specimen/${family.replace(/\s+/g, '+')}` : undefined
      });
    }

    return fontDefinitions;
  }

  private isGoogleFont(family: string): boolean {
    const stylesheets = Array.from(document.styleSheets);
    return stylesheets.some(sheet => {
      try {
        return sheet.href?.includes('fonts.googleapis.com');
      } catch {
        return false;
      }
    });
  }

  private buildMetadata(options: CaptureOptions, fonts: FontDefinition[]): PageMetadata {
    return {
      url: window.location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      timestamp: new Date().toISOString(),
      fonts,
      captureOptions: options
    };
  }

  private sendProgress(message: string, current: number, total: number): void {
    window.postMessage({
      type: 'WEB_TO_FIGMA_PROGRESS',
      message,
      current,
      total
    }, '*');
  }
}

new PageExtractor();
