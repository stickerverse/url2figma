import { ElementNode, RGBA, Fill, Effect, TextStyle, CornerRadius, Stroke, AssetRegistry, StyleRegistry, ComponentRegistry } from '../types/schema';
import { StyleParser } from './style-parser';
import { AssetHandler } from './asset-handler';
import { ComponentDetector } from './component-detector';

export class DOMExtractor {
  private elementCounter = 0;
  private assetRegistry: AssetRegistry = { images: {}, svgs: {} };
  private styleRegistry: StyleRegistry = { colors: {}, textStyles: {}, effects: {} };
  private componentRegistry: ComponentRegistry = { components: {} };
  private styleParser: StyleParser;
  private assetHandler: AssetHandler;
  private componentDetector: ComponentDetector;
  private processedElements = new Set<Element>();
  private elementMap = new Map<Element, string>();

  constructor() {
    this.styleParser = new StyleParser();
    this.assetHandler = new AssetHandler(this.assetRegistry);
    this.componentDetector = new ComponentDetector();
  }

  async extractElement(element: Element, parentScrollX = 0, parentScrollY = 0): Promise<ElementNode> {
    if (this.processedElements.has(element)) {
      throw new Error('Circular reference detected');
    }
    this.processedElements.add(element);

    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const id = `node-${this.elementCounter++}`;
    
    this.elementMap.set(element, id);

    if (computed.display === 'none' || computed.visibility === 'hidden' || rect.width === 0 || rect.height === 0) {
      return null as any;
    }

    const type = this.determineNodeType(element, computed);
    
    const node: ElementNode = {
      id,
      type,
      name: this.generateSemanticName(element),
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList),
      layout: {
        x: rect.left + parentScrollX,
        y: rect.top + parentScrollY,
        width: rect.width,
        height: rect.height
      },
      children: []
    };

    if (element.id) {
      node.cssId = element.id;
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      node.ariaLabel = ariaLabel;
    }

    const dataAttrs: Record<string, string> = {};
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        dataAttrs[attr.name] = attr.value;
      }
    });
    if (Object.keys(dataAttrs).length > 0) {
      node.dataAttributes = dataAttrs;
    }

    const transform = computed.transform;
    if (transform && transform !== 'none') {
      const rotation = this.extractRotation(transform);
      if (rotation !== 0) {
        node.layout.rotation = rotation;
      }
    }

    if (computed.display === 'flex' || computed.display === 'inline-flex') {
      node.autoLayout = this.extractAutoLayout(computed);
    }

    node.fills = this.styleParser.extractFills(computed, element);
    node.strokes = this.styleParser.extractStrokes(computed);
    node.effects = this.styleParser.extractEffects(computed);
    node.cornerRadius = this.styleParser.extractCornerRadius(computed);
    node.opacity = parseFloat(computed.opacity);
    
    const blendMode = this.styleParser.extractBlendMode(computed);
    if (blendMode !== 'NORMAL') {
      node.blendMode = blendMode;
    }

    switch (type) {
      case 'TEXT':
        await this.extractTextNode(node, element as HTMLElement, computed);
        break;
      case 'IMAGE':
        await this.extractImageNode(node, element as HTMLImageElement);
        break;
      case 'VECTOR':
        await this.extractVectorNode(node, element as SVGSVGElement);
        break;
    }

    const pseudoElements = await this.extractPseudoElements(element, parentScrollX, parentScrollY);
    if (pseudoElements) {
      node.pseudoElements = pseudoElements;
    }

    if (type !== 'TEXT' && type !== 'IMAGE' && element.children.length > 0) {
      for (const child of Array.from(element.children)) {
        if (this.shouldIncludeElement(child)) {
          try {
            const childNode = await this.extractElement(child, parentScrollX, parentScrollY);
            if (childNode) {
              node.children.push(childNode);
            }
          } catch (error) {
            console.warn('Failed to extract child element:', error);
          }
        }
      }
    }

    this.registerStyles(node);

    this.processedElements.delete(element);
    return node;
  }

  private determineNodeType(element: Element, computed: CSSStyleDeclaration): ElementNode['type'] {
    const tag = element.tagName.toLowerCase();
    
    if (tag === 'img' || tag === 'picture') {
      return 'IMAGE';
    }
    
    if (element instanceof SVGElement || tag === 'svg') {
      return 'VECTOR';
    }
    
    if (this.isTextNode(element, computed)) {
      return 'TEXT';
    }
    
    if (computed.backgroundImage && computed.backgroundImage !== 'none') {
      const hasChildren = element.children.length > 0;
      if (!hasChildren && element.textContent?.trim() === '') {
        return 'RECTANGLE';
      }
    }
    
    return 'FRAME';
  }

  private isTextNode(element: Element, computed: CSSStyleDeclaration): boolean {
    const textContent = element.textContent?.trim();
    if (!textContent) return false;
    
    const hasBlockChildren = Array.from(element.children).some(child => {
      const childComputed = window.getComputedStyle(child);
      return childComputed.display === 'block' || childComputed.display === 'flex';
    });
    
    if (hasBlockChildren) return false;
    
    const inlineDisplays = ['inline', 'inline-block', 'inline-flex'];
    if (inlineDisplays.includes(computed.display)) return true;
    
    if (element.children.length === 0) return true;
    
    const onlyInlineChildren = Array.from(element.children).every(child => {
      const childComputed = window.getComputedStyle(child);
      return inlineDisplays.includes(childComputed.display);
    });
    
    return onlyInlineChildren;
  }

  private extractAutoLayout(computed: CSSStyleDeclaration): ElementNode['autoLayout'] {
    const flexDirection = computed.flexDirection;
    const isColumn = flexDirection.includes('column');
    
    return {
      layoutMode: isColumn ? 'VERTICAL' : 'HORIZONTAL',
      primaryAxisAlignItems: this.mapJustifyContent(computed.justifyContent),
      counterAxisAlignItems: this.mapAlignItems(computed.alignItems),
      paddingTop: parseFloat(computed.paddingTop),
      paddingRight: parseFloat(computed.paddingRight),
      paddingBottom: parseFloat(computed.paddingBottom),
      paddingLeft: parseFloat(computed.paddingLeft),
      itemSpacing: parseFloat(computed.gap) || parseFloat(computed.columnGap) || 0,
      layoutGrow: parseFloat(computed.flexGrow) || 0,
      layoutAlign: this.mapAlignSelf(computed.alignSelf)
    };
  }

  private async extractTextNode(node: ElementNode, element: HTMLElement, computed: CSSStyleDeclaration): Promise<void> {
    node.characters = element.innerText || element.textContent || '';
    node.textStyle = this.styleParser.extractTextStyle(computed);
  }

  private async extractImageNode(node: ElementNode, img: HTMLImageElement): Promise<void> {
    const hash = await this.assetHandler.registerImage(
      img.src || img.currentSrc,
      img.naturalWidth || img.width,
      img.naturalHeight || img.height
    );
    
    node.imageHash = hash;
    
    node.fills = [{
      type: 'IMAGE',
      imageHash: hash,
      scaleMode: 'FILL',
      visible: true,
      opacity: 1
    }];
  }

  private async extractVectorNode(node: ElementNode, svg: SVGSVGElement): Promise<void> {
    const svgCode = svg.outerHTML;
    const width = svg.width.baseVal?.value || svg.clientWidth || 100;
    const height = svg.height.baseVal?.value || svg.clientHeight || 100;
    
    const hash = await this.assetHandler.registerSVG(svgCode, width, height);
    
    node.vectorData = {
      svgPath: svgCode,
      svgCode: svgCode,
      fills: node.fills || []
    };
  }

  private async extractPseudoElements(
    element: Element, 
    scrollX: number, 
    scrollY: number
  ): Promise<ElementNode['pseudoElements'] | undefined> {
    const before = window.getComputedStyle(element, '::before');
    const after = window.getComputedStyle(element, '::after');
    
    const result: ElementNode['pseudoElements'] = {};

    if (this.hasPseudoElement(before)) {
      result.before = await this.createPseudoElementNode(element, before, 'before', scrollX, scrollY);
    }

    if (this.hasPseudoElement(after)) {
      result.after = await this.createPseudoElementNode(element, after, 'after', scrollX, scrollY);
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private hasPseudoElement(style: CSSStyleDeclaration): boolean {
    const content = style.content;
    return !!(content && content !== 'none' && content !== '""' && content !== "''");
  }

  private async createPseudoElementNode(
    element: Element,
    style: CSSStyleDeclaration,
    type: 'before' | 'after',
    scrollX: number,
    scrollY: number
  ): Promise<ElementNode> {
    const rect = element.getBoundingClientRect();
    const id = `node-${this.elementCounter++}-pseudo-${type}`;
    
    let content = style.content.replace(/^["']|["']$/g, '');
    const isText = content.length > 0 && !content.startsWith('url(');
    
    const node: ElementNode = {
      id,
      type: isText ? 'TEXT' : 'RECTANGLE',
      name: `${this.generateSemanticName(element)}::${type}`,
      htmlTag: `pseudo-${type}`,
      cssClasses: [],
      layout: {
        x: rect.left + scrollX,
        y: rect.top + scrollY,
        width: parseFloat(style.width) || rect.width,
        height: parseFloat(style.height) || rect.height
      },
      children: []
    };

    if (isText) {
      node.characters = content;
      node.textStyle = this.styleParser.extractTextStyle(style);
    }

    node.fills = this.styleParser.extractFills(style, element);
    node.effects = this.styleParser.extractEffects(style);
    node.opacity = parseFloat(style.opacity);

    return node;
  }

  private generateSemanticName(element: Element): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return this.sanitizeName(ariaLabel);

    const testId = element.getAttribute('data-testid');
    if (testId) return this.sanitizeName(testId);

    if (element.id) return this.sanitizeName(element.id);

    const meaningfulClass = this.findMeaningfulClass(element);
    if (meaningfulClass) return this.sanitizeName(meaningfulClass);

    return element.tagName.toLowerCase();
  }

  private findMeaningfulClass(element: Element): string | null {
    const utilityPrefixes = ['px-', 'py-', 'mt-', 'mb-', 'ml-', 'mr-', 'bg-', 'text-', 'flex-', 'grid-', 'w-', 'h-'];
    
    const classes = Array.from(element.classList);
    for (const className of classes) {
      if (utilityPrefixes.some(prefix => className.startsWith(prefix))) {
        continue;
      }
      
      if (className.length < 2) {
        continue;
      }
      
      return className;
    }
    
    return null;
  }

  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  private shouldIncludeElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'meta', 'link'].includes(tag)) {
      return false;
    }
    
    const computed = window.getComputedStyle(element);
    if (computed.display === 'none' || computed.visibility === 'hidden') {
      return false;
    }
    
    return true;
  }

  private registerStyles(node: ElementNode): void {
    if (node.fills) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          this.registerColor(fill.color);
        }
      });
    }

    if (node.textStyle) {
      this.registerTextStyle(node.textStyle);
    }

    if (node.effects && node.effects.length > 0) {
      const effectKey = this.hashEffects(node.effects);
      if (!this.styleRegistry.effects[effectKey]) {
        this.styleRegistry.effects[effectKey] = node.effects;
      }
    }
  }

  private registerColor(color: RGBA): void {
    const colorKey = this.colorToHex(color);
    if (!this.styleRegistry.colors[colorKey]) {
      this.styleRegistry.colors[colorKey] = {
        id: `color-${Object.keys(this.styleRegistry.colors).length}`,
        name: colorKey,
        color: color,
        usageCount: 1
      };
    } else {
      this.styleRegistry.colors[colorKey].usageCount++;
    }
  }

  private registerTextStyle(style: TextStyle): void {
    const styleKey = `${style.fontFamily}-${style.fontWeight}-${style.fontSize}`;
    if (!this.styleRegistry.textStyles[styleKey]) {
      this.styleRegistry.textStyles[styleKey] = {
        ...style,
        id: `text-style-${Object.keys(this.styleRegistry.textStyles).length}`,
        name: `${style.fontFamily} ${style.fontWeight} ${style.fontSize}px`,
        usageCount: 1
      };
    } else {
      (this.styleRegistry.textStyles[styleKey] as any).usageCount++;
    }
  }

  private colorToHex(color: RGBA): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `${r}${g}${b}`;
  }

  private hashEffects(effects: Effect[]): string {
    return JSON.stringify(effects);
  }

  private extractRotation(transform: string): number {
    const match = transform.match(/rotate\(([^)]+)\)/);
    if (!match) return 0;
    
    const value = match[1];
    if (value.endsWith('deg')) {
      return parseFloat(value);
    }
    return parseFloat(value) * (180 / Math.PI);
  }

  private mapJustifyContent(value: string): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
    const map: Record<string, 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'> = {
      'flex-start': 'MIN',
      'start': 'MIN',
      'center': 'CENTER',
      'flex-end': 'MAX',
      'end': 'MAX',
      'space-between': 'SPACE_BETWEEN'
    };
    return map[value] || 'MIN';
  }

  private mapAlignItems(value: string): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' {
    const map: Record<string, 'MIN' | 'CENTER' | 'MAX' | 'STRETCH'> = {
      'flex-start': 'MIN',
      'start': 'MIN',
      'center': 'CENTER',
      'flex-end': 'MAX',
      'end': 'MAX',
      'stretch': 'STRETCH'
    };
    return map[value] || 'MIN';
  }

  private mapAlignSelf(value: string): 'STRETCH' | 'INHERIT' {
    return value === 'stretch' ? 'STRETCH' : 'INHERIT';
  }

  getAssetRegistry(): AssetRegistry {
    return this.assetRegistry;
  }

  getStyleRegistry(): StyleRegistry {
    return this.styleRegistry;
  }

  getComponentRegistry(): ComponentRegistry {
    return this.componentRegistry;
  }
}
