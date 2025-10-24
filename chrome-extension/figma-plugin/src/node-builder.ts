import { StyleManager } from './style-manager';
import { ComponentManager } from './component-manager';
import { ImportOptions } from './importer';

export class NodeBuilder {
  private imageCache: Map<string, Uint8Array> = new Map();
  private assets: any;

  constructor(
    private styleManager: StyleManager,
    private componentManager: ComponentManager,
    private options: ImportOptions,
    assets?: any
  ) {
    this.assets = assets;
  }

  setAssets(assets: any): void {
    this.assets = assets;
  }

  async createNode(nodeData: any): Promise<SceneNode | null> {
    switch (nodeData.type) {
      case 'FRAME':
        return this.createFrame(nodeData);
      case 'TEXT':
        return this.createText(nodeData);
      case 'RECTANGLE':
        return this.createRectangle(nodeData);
      case 'IMAGE':
        return this.createImage(nodeData);
      case 'VECTOR':
        return this.createVector(nodeData);
      case 'COMPONENT':
        return this.createComponent(nodeData);
      case 'INSTANCE':
        return this.createInstance(nodeData);
      default:
        return this.createFrame(nodeData);
    }
  }

  private createFrame(data: any): FrameNode {
    const frame = figma.createFrame();
    frame.name = data.name;
    frame.resize(data.layout.width, data.layout.height);
    frame.x = data.layout.x;
    frame.y = data.layout.y;

    if (this.options.applyAutoLayout && data.autoLayout) {
      this.applyAutoLayout(frame, data.autoLayout);
    }

    this.applyCommonStyles(frame, data);

    return frame;
  }

  private async createText(data: any): Promise<TextNode> {
    const text = figma.createText();
    text.name = data.name;
    text.x = data.layout.x;
    text.y = data.layout.y;

    if (data.textStyle) {
      try {
        await figma.loadFontAsync({ 
          family: data.textStyle.fontFamily, 
          style: this.mapFontWeight(data.textStyle.fontWeight)
        });
      } catch (e) {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      }

      text.fontName = { 
        family: data.textStyle.fontFamily, 
        style: this.mapFontWeight(data.textStyle.fontWeight)
      };
      text.fontSize = data.textStyle.fontSize;
      text.textAlignHorizontal = data.textStyle.textAlignHorizontal;
      
      if (data.textStyle.lineHeight.unit === 'PIXELS') {
        text.lineHeight = { value: data.textStyle.lineHeight.value, unit: 'PIXELS' };
      } else {
        text.lineHeight = { value: data.textStyle.lineHeight.value, unit: 'PERCENT' };
      }

      if (data.textStyle.letterSpacing.unit === 'PIXELS') {
        text.letterSpacing = { value: data.textStyle.letterSpacing.value, unit: 'PIXELS' };
      } else {
        text.letterSpacing = { value: data.textStyle.letterSpacing.value, unit: 'PERCENT' };
      }
    }

    text.characters = data.characters || '';

    if (data.textStyle?.fills) {
      text.fills = this.convertFills(data.textStyle.fills);
    }

    if (data.opacity !== undefined) {
      text.opacity = data.opacity;
    }

    return text;
  }

  private createRectangle(data: any): RectangleNode {
    const rect = figma.createRectangle();
    rect.name = data.name;
    rect.resize(data.layout.width, data.layout.height);
    rect.x = data.layout.x;
    rect.y = data.layout.y;

    this.applyCommonStyles(rect, data);

    return rect;
  }

  private async createImage(data: any): Promise<RectangleNode> {
    const rect = figma.createRectangle();
    rect.name = data.name;
    rect.resize(data.layout.width, data.layout.height);
    rect.x = data.layout.x;
    rect.y = data.layout.y;

    if (data.imageHash && this.assets?.images?.[data.imageHash]) {
      const imageAsset = this.assets.images[data.imageHash];
      await this.applyImageFill(rect, imageAsset);
    } else if (data.fills) {
      rect.fills = await this.convertFillsAsync(data.fills);
    }

    if (data.opacity !== undefined) {
      rect.opacity = data.opacity;
    }

    if (data.cornerRadius) {
      const avg = (
        data.cornerRadius.topLeft +
        data.cornerRadius.topRight +
        data.cornerRadius.bottomRight +
        data.cornerRadius.bottomLeft
      ) / 4;
      rect.cornerRadius = avg;
    }

    return rect;
  }

  private async applyImageFill(node: RectangleNode, imageAsset: any): Promise<void> {
    try {
      let imageData: Uint8Array;

      if (imageAsset.base64) {
        imageData = this.base64ToUint8Array(imageAsset.base64);
      } else if (imageAsset.url) {
        imageData = await this.fetchImage(imageAsset.url);
      } else {
        console.warn('No image source available');
        return;
      }

      const image = figma.createImage(imageData);
      node.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL'
      }];
    } catch (error) {
      console.error('Failed to apply image fill:', error);
      node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    }
  }

  private async fetchImage(url: string): Promise<Uint8Array> {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      this.imageCache.set(url, uint8Array);
      return uint8Array;
    } catch (error) {
      console.error(`Failed to fetch image from ${url}:`, error);
      throw error;
    }
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }

  private createVector(data: any): VectorNode {
    const vector = figma.createVector();
    vector.name = data.name;
    vector.resize(data.layout.width, data.layout.height);
    vector.x = data.layout.x;
    vector.y = data.layout.y;

    this.applyCommonStyles(vector, data);

    return vector;
  }

  private createComponent(data: any): ComponentNode {
    const component = figma.createComponent();
    component.name = data.name;
    component.resize(data.layout.width, data.layout.height);
    component.x = data.layout.x;
    component.y = data.layout.y;

    this.applyCommonStyles(component, data);

    return component;
  }

  private createInstance(data: any): InstanceNode | FrameNode {
    const componentId = data.componentId;
    const component = this.componentManager.getComponent(componentId);
    
    if (component) {
      const instance = component.createInstance();
      instance.name = data.name;
      instance.x = data.layout.x;
      instance.y = data.layout.y;
      return instance;
    }

    return this.createFrame(data);
  }

  private applyCommonStyles(node: any, data: any): void {
    if (data.fills && node.fills !== undefined) {
      node.fills = this.convertFills(data.fills);
    }

    if (data.strokes && node.strokes !== undefined) {
      node.strokes = this.convertStrokes(data.strokes);
    }

    if (data.effects && node.effects !== undefined) {
      node.effects = this.convertEffects(data.effects);
    }

    if (data.cornerRadius && node.cornerRadius !== undefined) {
      if (typeof node.cornerRadius === 'number') {
        const avg = (
          data.cornerRadius.topLeft +
          data.cornerRadius.topRight +
          data.cornerRadius.bottomRight +
          data.cornerRadius.bottomLeft
        ) / 4;
        node.cornerRadius = avg;
      }
    }

    if (data.opacity !== undefined && node.opacity !== undefined) {
      node.opacity = data.opacity;
    }

    if (data.blendMode && node.blendMode !== undefined) {
      node.blendMode = data.blendMode;
    }
  }

  private applyAutoLayout(frame: FrameNode, autoLayout: any): void {
    frame.layoutMode = autoLayout.layoutMode;
    frame.primaryAxisAlignItems = autoLayout.primaryAxisAlignItems;
    frame.counterAxisAlignItems = autoLayout.counterAxisAlignItems;
    frame.paddingTop = autoLayout.paddingTop;
    frame.paddingRight = autoLayout.paddingRight;
    frame.paddingBottom = autoLayout.paddingBottom;
    frame.paddingLeft = autoLayout.paddingLeft;
    frame.itemSpacing = autoLayout.itemSpacing;

    if (autoLayout.layoutGrow) {
      frame.layoutGrow = autoLayout.layoutGrow;
    }

    if (autoLayout.layoutAlign) {
      frame.layoutAlign = autoLayout.layoutAlign;
    }
  }

  private convertFills(fills: any[]): Paint[] {
    return fills.map(fill => {
      if (fill.type === 'SOLID') {
        return {
          type: 'SOLID',
          color: fill.color,
          opacity: fill.opacity
        } as SolidPaint;
      }

      if (fill.type === 'GRADIENT_LINEAR') {
        return {
          type: 'GRADIENT_LINEAR',
          gradientStops: fill.gradientStops,
          gradientTransform: fill.gradientTransform
        } as GradientPaint;
      }

      if (fill.type === 'GRADIENT_RADIAL') {
        return {
          type: 'GRADIENT_RADIAL',
          gradientStops: fill.gradientStops
        } as GradientPaint;
      }

      if (fill.type === 'IMAGE' && fill.imageHash) {
        return {
          type: 'IMAGE',
          imageHash: fill.imageHash,
          scaleMode: fill.scaleMode || 'FILL'
        } as ImagePaint;
      }

      return { type: 'SOLID', color: { r: 0, g: 0, b: 0 } } as SolidPaint;
    });
  }

  private async convertFillsAsync(fills: any[]): Promise<Paint[]> {
    const paints: Paint[] = [];

    for (const fill of fills) {
      if (fill.type === 'IMAGE' && fill.imageHash && this.assets?.images?.[fill.imageHash]) {
        const imageAsset = this.assets.images[fill.imageHash];
        try {
          let imageData: Uint8Array;

          if (imageAsset.base64) {
            imageData = this.base64ToUint8Array(imageAsset.base64);
          } else if (imageAsset.url) {
            imageData = await this.fetchImage(imageAsset.url);
          } else {
            continue;
          }

          const image = figma.createImage(imageData);
          paints.push({
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: fill.scaleMode || 'FILL'
          } as ImagePaint);
        } catch (error) {
          console.error('Failed to load image:', error);
          paints.push({ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } } as SolidPaint);
        }
      } else {
        paints.push(...this.convertFills([fill]));
      }
    }

    return paints;
  }

  private convertStrokes(strokes: any[]): Paint[] {
    return strokes.map(stroke => ({
      type: 'SOLID',
      color: stroke.color,
      opacity: stroke.opacity
    } as SolidPaint));
  }

  private convertEffects(effects: any[]): Effect[] {
    return effects.map(effect => {
      if (effect.type === 'DROP_SHADOW') {
        return {
          type: 'DROP_SHADOW',
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible,
          blendMode: effect.blendMode || 'NORMAL'
        } as DropShadowEffect;
      }

      if (effect.type === 'INNER_SHADOW') {
        return {
          type: 'INNER_SHADOW',
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible,
          blendMode: effect.blendMode || 'NORMAL'
        } as InnerShadowEffect;
      }

      if (effect.type === 'LAYER_BLUR') {
        return {
          type: 'LAYER_BLUR',
          radius: effect.radius,
          visible: effect.visible
        } as BlurEffect;
      }

      return {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: 4 },
        radius: 4,
        visible: true,
        blendMode: 'NORMAL'
      } as DropShadowEffect;
    });
  }

  private mapFontWeight(weight: number): string {
    const weightMap: { [key: number]: string } = {
      100: 'Thin',
      200: 'Extra Light',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'Semi Bold',
      700: 'Bold',
      800: 'Extra Bold',
      900: 'Black'
    };

    return weightMap[weight] || 'Regular';
  }
}
