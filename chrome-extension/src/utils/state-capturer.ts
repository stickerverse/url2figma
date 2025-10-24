import { ElementNode, VariantData } from '../types/schema';
import { StyleParser } from './style-parser';

export class StateCapturer {
  private styleParser = new StyleParser();

  async captureInteractiveStates(element: Element, baseNode: ElementNode): Promise<VariantData[]> {
    const variants: VariantData[] = [
      { state: 'default', properties: {} }
    ];

    try {
      const hoverState = await this.captureHoverState(element);
      if (hoverState) {
        variants.push(hoverState);
      }
    } catch (e) {
      console.warn('Failed to capture hover state:', e);
    }

    try {
      const focusState = await this.captureFocusState(element);
      if (focusState) {
        variants.push(focusState);
      }
    } catch (e) {
      console.warn('Failed to capture focus state:', e);
    }

    return variants.length > 1 ? variants : [];
  }

  private async captureHoverState(element: Element): Promise<VariantData | null> {
    const hoverStyles = window.getComputedStyle(element, ':hover');
    const defaultStyles = window.getComputedStyle(element);
    const differences = this.compareStyles(defaultStyles, hoverStyles);
    
    if (Object.keys(differences).length === 0) {
      return null;
    }

    return {
      state: 'hover',
      properties: differences
    };
  }

  private async captureFocusState(element: Element): Promise<VariantData | null> {
    if (!this.isFocusable(element)) {
      return null;
    }

    const focusStyles = window.getComputedStyle(element, ':focus');
    const defaultStyles = window.getComputedStyle(element);
    const differences = this.compareStyles(defaultStyles, focusStyles);
    
    if (Object.keys(differences).length === 0) {
      return null;
    }

    return {
      state: 'focus',
      properties: differences
    };
  }

  private isFocusable(element: Element): boolean {
    const focusableTags = ['a', 'button', 'input', 'textarea', 'select'];
    return focusableTags.includes(element.tagName.toLowerCase()) || 
           element.hasAttribute('tabindex');
  }

  private compareStyles(base: CSSStyleDeclaration, modified: CSSStyleDeclaration): Partial<ElementNode> {
    const differences: Partial<ElementNode> = {};

    if (base.backgroundColor !== modified.backgroundColor) {
      differences.fills = this.styleParser.extractFills(modified, null);
    }

    if (base.opacity !== modified.opacity) {
      differences.opacity = parseFloat(modified.opacity);
    }

    if (base.boxShadow !== modified.boxShadow) {
      differences.effects = this.styleParser.extractEffects(modified);
    }

    return differences;
  }
}
