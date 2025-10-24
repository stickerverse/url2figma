import { ElementNode, VariantsRegistry, ElementVariants } from '../types/schema';
import { StateCapturer } from './state-capturer';

export class VariantsCollector {
  private stateCapturer: StateCapturer;
  private variantsRegistry: VariantsRegistry = { elements: {} };

  constructor() {
    this.stateCapturer = new StateCapturer();
  }

  async collectVariants(tree: ElementNode): Promise<VariantsRegistry> {
    await this.traverseAndCollect(tree);
    return this.variantsRegistry;
  }

  private async traverseAndCollect(node: ElementNode): Promise<void> {
    if (this.isInteractiveElement(node)) {
      const variants = await this.captureElementVariants(node);
      if (variants) {
        this.variantsRegistry.elements[node.id] = variants;
      }
    }

    for (const child of node.children) {
      await this.traverseAndCollect(child);
    }
  }

  private isInteractiveElement(node: ElementNode): boolean {
    const interactiveTags = ['button', 'a', 'input', 'textarea', 'select'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];
    
    if (interactiveTags.includes(node.htmlTag)) return true;
    if (node.ariaLabel) return true;
    
    const hasInteractiveClass = node.cssClasses.some(cls => 
      cls.includes('btn') || 
      cls.includes('button') || 
      cls.includes('link') ||
      cls.includes('card') ||
      cls.includes('interactive')
    );
    
    return hasInteractiveClass;
  }

  private async captureElementVariants(node: ElementNode): Promise<ElementVariants | null> {
    const domElement = this.findDOMElement(node);
    if (!domElement) return null;

    const defaultState = this.cloneNode(node);
    const states: ElementVariants['states'] = { default: defaultState };

    try {
      const hoverState = await this.captureState(domElement, 'hover');
      if (hoverState) states.hover = hoverState;

      const focusState = await this.captureState(domElement, 'focus');
      if (focusState) states.focus = focusState;

      const activeState = await this.captureState(domElement, 'active');
      if (activeState) states.active = activeState;

      if (this.hasDisabledState(domElement)) {
        const disabledState = await this.captureState(domElement, 'disabled');
        if (disabledState) states.disabled = disabledState;
      }
    } catch (error) {
      console.warn('Failed to capture states for element:', node.name, error);
    }

    if (Object.keys(states).length <= 1) return null;

    return {
      elementId: node.id,
      baseElement: node,
      states,
      position: {
        x: node.layout.x,
        y: node.layout.y
      },
      selector: this.generateSelector(node)
    };
  }

  private async captureState(element: Element, state: string): Promise<ElementNode | null> {
    const originalStyles = window.getComputedStyle(element);
    let stateStyles: CSSStyleDeclaration;

    switch (state) {
      case 'hover':
        stateStyles = window.getComputedStyle(element, ':hover');
        break;
      case 'focus':
        stateStyles = window.getComputedStyle(element, ':focus');
        break;
      case 'active':
        stateStyles = window.getComputedStyle(element, ':active');
        break;
      case 'disabled':
        if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
          const wasDisabled = element.disabled;
          element.disabled = true;
          stateStyles = window.getComputedStyle(element);
          element.disabled = wasDisabled;
        } else {
          return null;
        }
        break;
      default:
        return null;
    }

    if (this.stylesAreDifferent(originalStyles, stateStyles)) {
      return this.createNodeFromStyles(element, stateStyles, state);
    }

    return null;
  }

  private stylesAreDifferent(base: CSSStyleDeclaration, modified: CSSStyleDeclaration): boolean {
    const importantProps = [
      'backgroundColor', 'color', 'borderColor', 'opacity',
      'transform', 'boxShadow', 'filter', 'cursor'
    ];

    return importantProps.some(prop => base[prop] !== modified[prop]);
  }

  private createNodeFromStyles(element: Element, styles: CSSStyleDeclaration, state: string): ElementNode {
    const rect = element.getBoundingClientRect();
    
    return {
      id: `${element.getAttribute('data-node-id')}-${state}`,
      type: 'FRAME',
      name: `${element.tagName.toLowerCase()}-${state}`,
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList),
      layout: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      fills: this.extractFillsFromStyles(styles),
      opacity: parseFloat(styles.opacity),
      children: []
    };
  }

  private extractFillsFromStyles(styles: CSSStyleDeclaration): any[] {
    return [];
  }

  private cloneNode(node: ElementNode): ElementNode {
    return JSON.parse(JSON.stringify(node));
  }

  private findDOMElement(node: ElementNode): Element | null {
    if (node.cssId) {
      return document.getElementById(node.cssId);
    }

    if (node.cssSelector) {
      return document.querySelector(node.cssSelector);
    }

    return null;
  }

  private hasDisabledState(element: Element): boolean {
    return element instanceof HTMLButtonElement || 
           element instanceof HTMLInputElement ||
           element instanceof HTMLSelectElement ||
           element instanceof HTMLTextAreaElement;
  }

  private generateSelector(node: ElementNode): string {
    if (node.cssId) {
      return `#${node.cssId}`;
    }

    if (node.cssClasses.length > 0) {
      return `.${node.cssClasses[0]}`;
    }

    return node.htmlTag;
  }

  getVariantsRegistry(): VariantsRegistry {
    return this.variantsRegistry;
  }
}
