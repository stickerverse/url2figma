import { StyleManager } from './style-manager';
import { ComponentManager } from './component-manager';
import { ImportOptions } from './importer';

type SceneNodeWithEffects = SceneNode & EffectMixin;
type SceneNodeWithGeometry = SceneNode & GeometryMixin;

export class NodeBuilder {
  private imageFetchCache = new Map<string, Uint8Array>();
  private imagePaintCache = new Map<string, string>();
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
    if (!nodeData) return null;

    if (nodeData.componentSignature) {
      const registered = this.componentManager.getComponentBySignature(nodeData.componentSignature);
      if (registered && nodeData.type !== 'COMPONENT') {
        const instance = registered.createInstance();
        await this.afterCreate(instance, nodeData, { reuseComponent: true });
        return instance;
      }
    }

    let node: SceneNode | null = null;

    switch (nodeData.type) {
      case 'TEXT':
        node = await this.createText(nodeData);
        break;
      case 'IMAGE':
        node = await this.createImage(nodeData);
        break;
      case 'VECTOR':
        node = await this.createVector(nodeData);
        break;
      case 'RECTANGLE':
        node = await this.createRectangle(nodeData);
        break;
      case 'COMPONENT':
        node = await this.createComponent(nodeData);
        break;
      case 'INSTANCE':
        node = await this.createInstance(nodeData);
        break;
      case 'FRAME':
      default:
        node = await this.createFrame(nodeData);
        break;
    }

    if (!node) {
      return null;
    }

    await this.afterCreate(node, nodeData, { reuseComponent: false });

    if (nodeData.type === 'COMPONENT') {
      const component = node as ComponentNode;
      const componentId = nodeData.componentId || nodeData.id || component.id;
      this.componentManager.registerComponent(componentId, component);
      if (nodeData.componentSignature) {
        this.componentManager.registerSignature(nodeData.componentSignature, component);
      }
    } else if (nodeData.componentSignature) {
      this.safeSetPluginData(node, 'componentSignature', nodeData.componentSignature);
    }

    return node;
  }

  private async createFrame(data: any): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = data.name || 'Frame';
    frame.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    return frame;
  }

  private async createRectangle(data: any): Promise<RectangleNode> {
    const rect = figma.createRectangle();
    rect.name = data.name || 'Rectangle';
    rect.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    return rect;
  }

  private async createText(data: any): Promise<TextNode> {
    const text = figma.createText();
    text.name = data.name || 'Text';

    if (data.textStyle) {
      const fontStyle = this.mapFontWeight(data.textStyle.fontWeight);
      try {
        await figma.loadFontAsync({ family: data.textStyle.fontFamily, style: fontStyle });
      } catch {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      }

      text.fontName = { family: data.textStyle.fontFamily, style: fontStyle };
      text.fontSize = data.textStyle.fontSize;
      text.textAlignHorizontal = data.textStyle.textAlignHorizontal;
      text.textAlignVertical = data.textStyle.textAlignVertical;

      if (data.textStyle.lineHeight?.unit === 'PIXELS') {
        text.lineHeight = { unit: 'PIXELS', value: data.textStyle.lineHeight.value };
      } else if (data.textStyle.lineHeight?.unit === 'PERCENT') {
        text.lineHeight = { unit: 'PERCENT', value: data.textStyle.lineHeight.value };
      } else {
        text.lineHeight = { unit: 'AUTO' };
      }

      if (data.textStyle.letterSpacing?.unit === 'PIXELS') {
        text.letterSpacing = { unit: 'PIXELS', value: data.textStyle.letterSpacing.value };
      } else {
        text.letterSpacing = {
          unit: data.textStyle.letterSpacing?.unit || 'PIXELS',
          value: data.textStyle.letterSpacing?.value || 0
        };
      }

      if (data.textStyle?.fills?.length) {
        text.fills = await this.convertFillsAsync(data.textStyle.fills);
      }

      if (data.textStyle.fontStyle) {
        this.safeSetPluginData(text, 'fontStyle', data.textStyle.fontStyle);
      }
      if (data.textStyle.paragraphSpacing !== undefined) {
        this.safeSetPluginData(text, 'paragraphSpacing', String(data.textStyle.paragraphSpacing));
      }
      if (data.textStyle.paragraphIndent !== undefined) {
        this.safeSetPluginData(text, 'paragraphIndent', String(data.textStyle.paragraphIndent));
      }
      if (data.textStyle.whiteSpace) {
        this.safeSetPluginData(text, 'whiteSpace', data.textStyle.whiteSpace);
      }
      if (data.textStyle.listStyleType) {
        this.safeSetPluginData(text, 'listStyleType', data.textStyle.listStyleType);
      }
    }

    text.characters = data.characters || '';
    return text;
  }

  private async createImage(data: any): Promise<RectangleNode> {
    const rect = figma.createRectangle();
    rect.name = data.name || 'Image';
    rect.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    return rect;
  }

  private async createVector(data: any): Promise<SceneNode | null> {
    if (data.vectorData?.svgCode) {
      try {
        const vectorRoot = figma.createNodeFromSvg(data.vectorData.svgCode);
        vectorRoot.name = data.name || 'Vector';
        return vectorRoot as SceneNode;
      } catch (error) {
        console.warn('Failed to create vector from SVG, falling back to rectangle.', error);
      }
    }

    return this.createRectangle(data);
  }

  private async createComponent(data: any): Promise<ComponentNode> {
    const component = figma.createComponent();
    component.name = data.name || 'Component';
    component.resize(Math.max(data.layout.width || 1, 1), Math.max(data.layout.height || 1, 1));
    return component;
  }

  private async createInstance(data: any): Promise<SceneNode | null> {
    const componentId = data.componentId || data.componentKey || data.id;
    if (componentId) {
      const existing = this.componentManager.getComponent(componentId);
      if (existing) {
        return existing.createInstance();
      }
    }

    const signature = data.componentSignature;
    if (signature) {
      const registered = this.componentManager.getComponentBySignature(signature);
      if (registered) {
        return registered.createInstance();
      }
    }

    return this.createFrame(data);
  }

  private async afterCreate(node: SceneNode, data: any, meta: { reuseComponent: boolean }): Promise<void> {
    node.name = data.name || node.name;

    this.applyPositioning(node, data);
    await this.applyCommonStyles(node, data);
    this.applyAutoLayout(node, data);
    this.applyOverflow(node, data);
    this.applyVisibility(node, data);
    this.applyFilters(node, data);
    this.applyMetadata(node, data, meta);
  }

  private applyPositioning(node: SceneNode, data: any) {
    if (data.layout) {
      node.x = data.layout.x || 0;
      node.y = data.layout.y || 0;
      if ('rotation' in node) {
        (node as any).rotation = data.layout.rotation || 0;
      }
      if (typeof data.layout.width === 'number' && typeof data.layout.height === 'number') {
        if ('resize' in node) {
          (node as LayoutMixin).resize(Math.max(data.layout.width, 1), Math.max(data.layout.height, 1));
        }
      }
    }

    if ('layoutPositioning' in node && data.position && data.position !== 'static') {
      (node as any).layoutPositioning = 'ABSOLUTE';
    }

    if ('layoutGrow' in node && typeof data.autoLayout?.layoutGrow === 'number') {
      (node as any).layoutGrow = data.autoLayout.layoutGrow;
    }
    if ('layoutAlign' in node && data.autoLayout?.layoutAlign) {
      (node as any).layoutAlign = data.autoLayout.layoutAlign;
    }

    if (data.transform?.matrix?.length >= 6 && 'relativeTransform' in node) {
      const [a, b, c, d, tx, ty] = data.transform.matrix;
      (node as any).relativeTransform = [
        [a ?? 1, c ?? 0, tx ?? node.x],
        [b ?? 0, d ?? 1, ty ?? node.y]
      ];
    }
  }

  private async applyCommonStyles(node: SceneNode, data: any): Promise<void> {
    if (data.fills && 'fills' in node && node.type !== 'TEXT') {
      (node as SceneNodeWithGeometry).fills = await this.convertFillsAsync(data.fills);
    }

    if (data.strokes && 'strokes' in node) {
      (node as SceneNodeWithGeometry).strokes = await this.convertStrokesAsync(data.strokes);
    }

    if ('strokeWeight' in node && data.strokeWeight !== undefined) {
      (node as any).strokeWeight = data.strokeWeight;
    } else if ('strokeWeight' in node && data.strokes?.[0]?.thickness) {
      (node as any).strokeWeight = data.strokes[0].thickness;
    }

    if ('strokeAlign' in node && data.strokeAlign) {
      (node as any).strokeAlign = data.strokeAlign;
    }

    if (data.cornerRadius && 'cornerRadius' in node) {
      this.applyCornerRadius(node as any, data.cornerRadius);
    }

    const existingEffects = 'effects' in node ? [...((node as SceneNodeWithEffects).effects || [])] : [];
    if (data.effects?.length && 'effects' in node) {
      existingEffects.push(...this.convertEffects(data.effects));
    }

    if (existingEffects.length && 'effects' in node) {
      (node as SceneNodeWithEffects).effects = existingEffects;
    }

    if (data.opacity !== undefined && 'opacity' in node) {
      (node as any).opacity = data.opacity;
    }

    if (data.blendMode && 'blendMode' in node) {
      (node as any).blendMode = data.blendMode;
    }
    if (data.mixBlendMode && 'blendMode' in node) {
      (node as any).blendMode = data.mixBlendMode;
    }
  }

  private applyCornerRadius(node: any, radius: any) {
    if (typeof radius === 'number') {
      node.cornerRadius = radius;
    } else {
      node.topLeftRadius = radius.topLeft || 0;
      node.topRightRadius = radius.topRight || 0;
      node.bottomRightRadius = radius.bottomRight || 0;
      node.bottomLeftRadius = radius.bottomLeft || 0;
    }
  }

  private applyAutoLayout(node: SceneNode, data: any) {
    if (!this.options.applyAutoLayout || !data.autoLayout) return;
    if (!('layoutMode' in node)) return;

    const frameNode = node as FrameNode;
    const autoLayout = data.autoLayout;

    // Only apply auto layout if it's a flex container
    if (autoLayout.layoutMode && autoLayout.layoutMode !== 'NONE') {
      frameNode.layoutMode = autoLayout.layoutMode;

      if (autoLayout.primaryAxisAlignItems) {
        frameNode.primaryAxisAlignItems = autoLayout.primaryAxisAlignItems;
      }

      if (autoLayout.counterAxisAlignItems) {
        frameNode.counterAxisAlignItems = autoLayout.counterAxisAlignItems;
      }

      if (typeof autoLayout.itemSpacing === 'number') {
        frameNode.itemSpacing = autoLayout.itemSpacing;
      }

      if (typeof autoLayout.paddingTop === 'number') {
        frameNode.paddingTop = autoLayout.paddingTop;
      }
      if (typeof autoLayout.paddingRight === 'number') {
        frameNode.paddingRight = autoLayout.paddingRight;
      }
      if (typeof autoLayout.paddingBottom === 'number') {
        frameNode.paddingBottom = autoLayout.paddingBottom;
      }
      if (typeof autoLayout.paddingLeft === 'number') {
        frameNode.paddingLeft = autoLayout.paddingLeft;
      }

      // Set sizing modes if present
      if (autoLayout.primaryAxisSizingMode) {
        frameNode.primaryAxisSizingMode = autoLayout.primaryAxisSizingMode;
      }
      if (autoLayout.counterAxisSizingMode) {
        frameNode.counterAxisSizingMode = autoLayout.counterAxisSizingMode;
      }
    }
  }

  private applyOverflow(node: SceneNode, data: any) {
    if (!data.overflow) return;
    if ('clipsContent' in node) {
      const horizontalHidden = data.overflow.horizontal === 'hidden' || data.overflow.horizontal === 'clip';
      const verticalHidden = data.overflow.vertical === 'hidden' || data.overflow.vertical === 'clip';
      (node as FrameNode).clipsContent = horizontalHidden || verticalHidden;
    }
  }

  private applyVisibility(node: SceneNode, data: any) {
    if (data.display === 'none' || data.visibility === 'hidden' || data.visibility === 'collapse') {
      node.visible = false;
    } else {
      node.visible = true;
    }
  }

  private applyFilters(node: SceneNode, data: any) {
    if (!('setPluginData' in node)) return;
    const existingEffects = 'effects' in node ? [...((node as SceneNodeWithEffects).effects || [])] : [];

    (data.filters || []).forEach((filter: any) => {
      if (filter.type === 'blur' && 'effects' in node) {
        existingEffects.push({
          type: 'LAYER_BLUR',
          radius: filter.unit === 'px' ? filter.value : filter.value || 0,
          visible: true
        } as BlurEffect);
      }
      if (filter.type === 'dropShadow' && 'effects' in node) {
        existingEffects.push({
          type: 'DROP_SHADOW',
          color: filter.color || { r: 0, g: 0, b: 0, a: 0.5 },
          offset: filter.offset || { x: 0, y: 0 },
          radius: filter.unit === 'px' ? filter.value : filter.value || 0,
          spread: 0,
          visible: true,
          blendMode: 'NORMAL'
        } as DropShadowEffect);
      }
    });

    if (existingEffects.length && 'effects' in node) {
      (node as SceneNodeWithEffects).effects = existingEffects;
    }

    if (data.filters?.length) {
      this.safeSetPluginData(node, 'cssFilters', JSON.stringify(data.filters));
    }
    if (data.backdropFilters?.length) {
      this.safeSetPluginData(node, 'cssBackdropFilters', JSON.stringify(data.backdropFilters));
    }
  }

  private applyMetadata(node: SceneNode, data: any, meta: { reuseComponent: boolean }) {
    this.applyConstraints(node, data);

    if ('layoutGrow' in node && data.autoLayout?.layoutGrow !== undefined) {
      (node as any).layoutGrow = data.autoLayout.layoutGrow;
    }
    if ('layoutAlign' in node && data.autoLayout?.layoutAlign) {
      (node as any).layoutAlign = data.autoLayout.layoutAlign;
    }

    this.safeSetPluginData(node, 'sourceNodeId', data.id || '');
    this.safeSetPluginData(node, 'htmlTag', data.htmlTag || '');

    if (data.cssClasses?.length) {
      this.safeSetPluginData(node, 'cssClasses', JSON.stringify(data.cssClasses));
    }

    if (data.dataAttributes && Object.keys(data.dataAttributes).length) {
      this.safeSetPluginData(node, 'dataAttributes', JSON.stringify(data.dataAttributes));
    }

    if (data.cssCustomProperties) {
      this.safeSetPluginData(node, 'cssCustomProperties', JSON.stringify(data.cssCustomProperties));
    }

    if (data.clipPath) {
      this.safeSetPluginData(node, 'cssClipPath', JSON.stringify(data.clipPath));
    }

    if (data.mask) {
      this.safeSetPluginData(node, 'cssMask', JSON.stringify(data.mask));
    }

    if (data.pointerEvents) {
      this.safeSetPluginData(node, 'pointerEvents', data.pointerEvents);
    }

    if (data.position) {
      this.safeSetPluginData(node, 'positioning', data.position);
    }

    if (data.absoluteLayout) {
      this.safeSetPluginData(node, 'absoluteLayout', JSON.stringify(data.absoluteLayout));
    }

    if (data.scrollData) {
      this.safeSetPluginData(node, 'scrollData', JSON.stringify(data.scrollData));
    }

    if (data.contentHash) {
      this.safeSetPluginData(node, 'contentHash', data.contentHash);
    }

    if (meta.reuseComponent) {
      this.safeSetPluginData(node, 'componentInstance', 'true');
    }
  }

  private applyConstraints(node: SceneNode, data: any) {
    if (!data.constraints) return;
    if ('constraints' in node) {
      (node as ConstraintMixin).constraints = {
        horizontal: data.constraints.horizontal || 'MIN',
        vertical: data.constraints.vertical || 'MIN'
      };
    }
  }

  private async convertFillsAsync(fills: any[]): Promise<Paint[]> {
    const paints: Paint[] = [];

    for (const fill of fills) {
      if (!fill) continue;

      if (fill.type === 'SOLID' && fill.color) {
        paints.push({
          type: 'SOLID',
          color: fill.color,
          opacity: fill.opacity !== undefined ? fill.opacity : fill.color.a ?? 1,
          visible: fill.visible !== false
        } as SolidPaint);
        continue;
      }

      if ((fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') && fill.gradientStops) {
        paints.push({
          type: fill.type,
          gradientStops: fill.gradientStops.map((stop: any) => ({
            position: stop.position,
            color: stop.color
          })),
          gradientTransform: fill.gradientTransform || [
            [1, 0, 0],
            [0, 1, 0]
          ],
          visible: fill.visible !== false
        } as GradientPaint);
        continue;
      }

      if (fill.type === 'IMAGE') {
        paints.push(await this.resolveImagePaint(fill));
        continue;
      }
    }

    return paints;
  }

  private async resolveImagePaint(fill: any): Promise<Paint> {
    const hash = fill.imageHash;
    if (!hash || !this.assets?.images?.[hash]) {
      return {
        type: 'SOLID',
        color: { r: 0.9, g: 0.9, b: 0.9 },
        opacity: 1
      } as SolidPaint;
    }

    if (this.imagePaintCache.has(hash)) {
      const cachedHash = this.imagePaintCache.get(hash)!;
      return {
        type: 'IMAGE',
        imageHash: cachedHash,
        scaleMode: fill.scaleMode || 'FILL'
      } as ImagePaint;
    }

    try {
      const asset = this.assets.images[hash];
      let imageBytes: Uint8Array | undefined;

      if (asset.base64) {
        imageBytes = this.base64ToUint8Array(asset.base64);
      } else if (asset.url) {
        imageBytes = await this.fetchImage(asset.url);
      }

      if (!imageBytes) {
        throw new Error('No image data available');
      }

      const image = figma.createImage(imageBytes);
      this.imagePaintCache.set(hash, image.hash);

      return {
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: fill.scaleMode || 'FILL'
      } as ImagePaint;
    } catch (error) {
      console.warn('Failed to resolve image paint', error);
      return {
        type: 'SOLID',
        color: { r: 0.9, g: 0.9, b: 0.9 },
        opacity: 1
      } as SolidPaint;
    }
  }

  private async convertStrokesAsync(strokes: any[]): Promise<Paint[]> {
    return strokes.map((stroke) => ({
      type: 'SOLID',
      color: stroke.color || { r: 0, g: 0, b: 0 },
      opacity: stroke.opacity !== undefined ? stroke.opacity : stroke.color?.a ?? 1,
      visible: stroke.visible !== false
    })) as SolidPaint[];
  }

  private convertEffects(effects: any[]): Effect[] {
    return effects.map((effect) => {
      if (effect.type === 'DROP_SHADOW') {
        return {
          type: 'DROP_SHADOW',
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible !== false,
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
          visible: effect.visible !== false,
          blendMode: effect.blendMode || 'NORMAL'
        } as InnerShadowEffect;
      }

      if (effect.type === 'LAYER_BLUR') {
        return {
          type: 'LAYER_BLUR',
          radius: effect.radius,
          visible: effect.visible !== false
        } as BlurEffect;
      }

      if (effect.type === 'BACKGROUND_BLUR') {
        return {
          type: 'BACKGROUND_BLUR',
          radius: effect.radius,
          visible: effect.visible !== false
        } as BackgroundBlurEffect;
      }

      return effect;
    });
  }

  private async fetchImage(url: string): Promise<Uint8Array> {
    if (this.imageFetchCache.has(url)) {
      return this.imageFetchCache.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    this.imageFetchCache.set(url, bytes);
    return bytes;
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const normalized = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(normalized);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private mapFontWeight(weight: number): string {
    const map: Record<number, string> = {
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
    return map[weight] || 'Regular';
  }

  private safeSetPluginData(node: SceneNode, key: string, value: string) {
    try {
      node.setPluginData(key, value);
    } catch {
      // Ignore plugin data errors for nodes that cannot store plugin data (rare)
    }
  }
}
