import { DOMExtractor } from './utils/dom-extractor';
import { WebToFigmaSchema } from './types/schema';

console.log('🎯 Enhanced injected script loaded - with page scrolling and design tokens');

// Enhanced extraction with page scrolling and design token generation
class EnhancedExtractor {
  private pageScroller: any;
  private designTokens: any = {};

  constructor() {
    this.initializePageScroller();
    this.initializeDesignTokens();
  }

  private initializePageScroller() {
    this.pageScroller = {
      scrollToRevealContent: async () => {
        console.log('🔄 Starting page scroll to reveal all content...');
        
        const originalScrollY = window.scrollY;
        const documentHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        
        // Scroll in increments to trigger lazy loading
        const scrollStep = window.innerHeight * 0.8;
        let currentPosition = 0;
        
        while (currentPosition < documentHeight) {
          window.scrollTo(0, currentPosition);
          await this.wait(500); // Wait for content to load
          
          // Check for new content that may have loaded
          const newHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          
          if (newHeight > documentHeight) {
            console.log('📈 New content detected, extending scroll range');
          }
          
          currentPosition += scrollStep;
          
          // Send progress update
          window.postMessage({
            type: 'SCROLL_PROGRESS',
            progress: Math.min((currentPosition / documentHeight) * 100, 100)
          }, '*');
        }
        
        // Scroll back to top
        window.scrollTo(0, originalScrollY);
        console.log('✅ Page scroll complete - all content revealed');
      }
    };
  }

  private initializeDesignTokens() {
    this.designTokens = {
      colors: new Map(),
      typography: new Map(),
      spacing: new Map(),
      shadows: new Map(),
      borderRadius: new Map(),
      extractFromElement: (element: Element) => {
        const computed = window.getComputedStyle(element);
        
        // Extract color tokens
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          this.designTokens.colors.set(computed.backgroundColor, {
            value: computed.backgroundColor,
            usage: (this.designTokens.colors.get(computed.backgroundColor)?.usage || 0) + 1,
            elements: [...(this.designTokens.colors.get(computed.backgroundColor)?.elements || []), element.tagName]
          });
        }
        
        if (computed.color && computed.color !== 'rgba(0, 0, 0, 0)') {
          this.designTokens.colors.set(computed.color, {
            value: computed.color,
            usage: (this.designTokens.colors.get(computed.color)?.usage || 0) + 1,
            elements: [...(this.designTokens.colors.get(computed.color)?.elements || []), element.tagName]
          });
        }
        
        // Extract typography tokens
        const fontFamily = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        const fontSize = computed.fontSize;
        const fontWeight = computed.fontWeight;
        const lineHeight = computed.lineHeight;
        
        const typographyKey = `${fontFamily}-${fontSize}-${fontWeight}`;
        this.designTokens.typography.set(typographyKey, {
          fontFamily,
          fontSize,
          fontWeight,
          lineHeight,
          usage: (this.designTokens.typography.get(typographyKey)?.usage || 0) + 1
        });
        
        // Extract spacing tokens
        ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 
         'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
          const value = computed[prop as keyof CSSStyleDeclaration] as string;
          if (value && value !== '0px') {
            this.designTokens.spacing.set(value, {
              value,
              property: prop,
              usage: (this.designTokens.spacing.get(value)?.usage || 0) + 1
            });
          }
        });
        
        // Extract shadow tokens
        if (computed.boxShadow && computed.boxShadow !== 'none') {
          this.designTokens.shadows.set(computed.boxShadow, {
            value: computed.boxShadow,
            usage: (this.designTokens.shadows.get(computed.boxShadow)?.usage || 0) + 1
          });
        }
        
        // Extract border radius tokens
        if (computed.borderRadius && computed.borderRadius !== '0px') {
          this.designTokens.borderRadius.set(computed.borderRadius, {
            value: computed.borderRadius,
            usage: (this.designTokens.borderRadius.get(computed.borderRadius)?.usage || 0) + 1
          });
        }
      },
      
      generateTokens: () => {
        return {
          colors: Object.fromEntries(this.designTokens.colors),
          typography: Object.fromEntries(this.designTokens.typography),
          spacing: Object.fromEntries(this.designTokens.spacing),
          shadows: Object.fromEntries(this.designTokens.shadows),
          borderRadius: Object.fromEntries(this.designTokens.borderRadius)
        };
      }
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async performCompleteExtraction() {
    console.log('🚀 Starting complete extraction with scrolling and design tokens...');
    
    // Step 1: Scroll page to reveal all content
    await this.pageScroller.scrollToRevealContent();
    
    // Step 2: Extract DOM tree with enhanced data
    console.log('🔍 Extracting DOM tree with design tokens...');
    const extractor = new DOMExtractor();

    // Step 3: Extract design tokens from all visible elements
    console.log('🎨 Extracting design tokens...');
    const allElements = document.querySelectorAll('*');
    let tokenCount = 0;
    
    allElements.forEach((element, index) => {
      if ((element as HTMLElement).offsetParent !== null) { // Only visible elements
        this.designTokens.extractFromElement(element);
        tokenCount++;
        
        // Progress update every 100 elements
        if (index % 100 === 0) {
          window.postMessage({
            type: 'TOKEN_EXTRACTION_PROGRESS',
            progress: (index / allElements.length) * 100,
            tokenCount
          }, '*');
        }
      }
    });
    
    const generatedTokens = this.designTokens.generateTokens();
    
    console.log('✅ Design token extraction complete:', {
      colors: Object.keys(generatedTokens.colors).length,
      typography: Object.keys(generatedTokens.typography).length,
      spacing: Object.keys(generatedTokens.spacing).length,
      shadows: Object.keys(generatedTokens.shadows).length,
      borderRadius: Object.keys(generatedTokens.borderRadius).length
    });
    
    // Step 4: Create enhanced schema with design tokens
    const schema = await extractor.extractPage();
    schema.designTokens = generatedTokens;
    schema.metadata.extractionSummary = {
      scrollComplete: true,
      tokensExtracted: true,
      totalElements: allElements.length,
      visibleElements: tokenCount
    };

    return schema;
  }
}

// Main message listener with enhanced extraction
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data.type !== 'START_EXTRACTION') return;

  console.log('🎯 Starting enhanced extraction with page scrolling...');

  try {
    const enhancedExtractor = new EnhancedExtractor();
    const schema = await enhancedExtractor.performCompleteExtraction();
    if (event.data.screenshot) {
      schema.screenshot = event.data.screenshot;
    }

    window.postMessage({
      type: 'EXTRACTION_COMPLETE',
      data: schema
    }, '*');

    console.log('✅ Enhanced extraction complete with design tokens');
  } catch (error) {
    console.error('❌ Enhanced extraction failed:', error);
    window.postMessage({
      type: 'EXTRACTION_ERROR',
      error: String(error)
    }, '*');
  }
});
