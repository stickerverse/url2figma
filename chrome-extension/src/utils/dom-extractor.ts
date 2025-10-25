import {
  AssetRegistry,
  BackgroundLayer,
  ClipPathData,
  ColorStyle,
  ElementNode,
  Fill,
  FilterData,
  FontDefinition,
  GradientAsset,
  InlineTextSegment,
  MaskData,
  OutlineData,
  RGBA,
  ScrollData,
  Stroke,
  StyleRegistry,
  TextStyle,
  TransformData,
  WebToFigmaSchema
} from '../types/schema';

interface FontUsage {
  fontFamily: string;
  weights: Set<number>;
}

interface GradientDefinition {
  type: 'linear' | 'radial';
  stops: Array<{ position: number; color: RGBA }>;
  transform: [[number, number, number], [number, number, number]];
}

export class DOMExtractor {
  private elementCounter = 0;
  private assetRegistry: AssetRegistry = { images: {}, svgs: {}, gradients: {} };
  private styleRegistry: StyleRegistry = {
    colors: {},
    textStyles: {},
    effects: {}
  };
  private fontUsage = new Map<string, FontUsage>();

  async extractPage(): Promise<WebToFigmaSchema> {
    this.elementCounter = 0;
    this.assetRegistry = { images: {}, svgs: {}, gradients: {} };
    this.styleRegistry = { colors: {}, textStyles: {}, effects: {} };
    this.fontUsage.clear();

    const tree = await this.extractElement(document.body);
    const fonts = this.buildFontDefinitions();

    return {
      version: '2.0.0',
      metadata: {
        url: window.location.href,
        title: document.title || 'Captured Page',
        timestamp: new Date().toISOString(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1
        },
        fonts
      },
      tree,
      assets: this.assetRegistry,
      styles: this.styleRegistry
    };
  }

  private async extractElement(
    element: Element,
    parentRect?: DOMRect
  ): Promise<ElementNode> {
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const id = `node-${this.elementCounter++}`;

    const type = this.determineNodeType(element, computed);

    const node: ElementNode = {
      id,
      type,
      name: this.generateSemanticName(element),
      htmlTag: element.tagName.toLowerCase(),
      cssClasses: Array.from(element.classList || []),
      cssId: (element as HTMLElement).id || undefined,
      layout: {
        x: parentRect ? rect.left - parentRect.left : 0,
        y: parentRect ? rect.top - parentRect.top : 0,
        width: rect.width,
        height: rect.height
      },
      children: []
    };

    if (!parentRect && element === document.body) {
      node.layout.x = 0;
      node.layout.y = 0;
      node.layout.width =
        rect.width || document.documentElement.scrollWidth || window.innerWidth;
      node.layout.height =
        rect.height || document.documentElement.scrollHeight || window.innerHeight;
    }

    node.absoluteLayout = {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      right: rect.right + window.scrollX,
      bottom: rect.bottom + window.scrollY,
      width: rect.width,
      height: rect.height
    };

    node.position = this.mapPosition(computed.position);
    node.display = computed.display || undefined;
    node.visibility = this.mapVisibility(computed.visibility);
    node.pointerEvents = computed.pointerEvents || undefined;
    node.overflow = {
      horizontal: this.mapOverflow(computed.overflowX),
      vertical: this.mapOverflow(computed.overflowY)
    };
    node.zIndex = this.parseZIndex(computed.zIndex);
    node.order = this.parseOptionalNumber((computed as any).order);
    node.isStackingContext = this.detectStackingContext(element, computed);

    const rotation = this.extractRotation(computed);
    if (rotation) {
      node.layout.rotation = rotation;
    }

    if (element instanceof HTMLElement) {
      if (computed.display === 'flex' || computed.display === 'inline-flex') {
        node.autoLayout = this.extractAutoLayout(computed);
      } else {
        node.autoLayout = {
          layoutMode: 'NONE',
          primaryAxisAlignItems: 'MIN',
          counterAxisAlignItems: 'MIN',
          paddingTop: parseFloat(computed.paddingTop) || 0,
          paddingRight: parseFloat(computed.paddingRight) || 0,
          paddingBottom: parseFloat(computed.paddingBottom) || 0,
          paddingLeft: parseFloat(computed.paddingLeft) || 0,
          itemSpacing: 0
        };
      }

      const fills = this.extractFills(computed, element);
      node.fills = fills;
      node.strokes = this.extractStrokes(computed);
      node.strokeWeight = this.extractStrokeWeight(computed);
      node.strokeAlign = this.extractStrokeAlign(computed);
      node.effects = this.extractEffects(computed);
      node.cornerRadius = this.extractCornerRadius(computed);
      node.opacity = parseFloat(computed.opacity) || 1;
      node.blendMode = this.mapBlendMode(computed.mixBlendMode);
      node.mixBlendMode = node.blendMode;
      node.backgrounds = this.extractBackgroundLayers(computed, element, fills);
      node.outline = this.extractOutline(computed);
      node.transform = this.extractTransform(computed.transform);
      node.transformOrigin = this.extractTransformOrigin(computed.transformOrigin);
      node.perspective = this.parseOptionalNumber((computed as any).perspective);
      node.filters = this.parseFilters(computed.filter);
      node.backdropFilters = this.parseFilters(
        (computed as any).backdropFilter || (computed as any).WebkitBackdropFilter
      );
      node.clipPath = this.extractClipPath(computed.clipPath);
      node.mask = this.extractMask(computed.maskImage, computed.maskClip, computed.maskMode);
      node.scrollData = this.extractScrollData(element);
      node.cssCustomProperties = this.collectCustomProperties(computed);

      if (type === 'TEXT') {
        node.characters = element.innerText || '';
        node.textStyle = this.extractTextStyle(computed);
        this.registerFontUsage(node.textStyle);
        const segments = this.buildInlineTextSegments(element, node);
        if (segments.length) {
          node.inlineTextSegments = segments;
        }
      }
    }

    if (type === 'IMAGE') {
      const img = element as HTMLImageElement;
      node.imageHash = await this.registerImage(
        img.src,
        img.naturalWidth,
        img.naturalHeight
      );
    }

    if (type === 'VECTOR' && element instanceof SVGElement) {
      node.vectorData = this.extractVectorData(element as SVGElement);
    }

    node.children = await this.extractChildren(element, rect);

    this.registerStyles(node);

    node.componentSignature = this.createComponentSignature(element, node);
    node.contentHash = this.createContentHash(node);

    return node;
  }

  private async extractChildren(
    element: Element,
    parentRect: DOMRect
  ): Promise<ElementNode[]> {
    const children: ElementNode[] = [];
    const htmlChildren = Array.from(element.children);

    const textNodes = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0
    ) as Text[];

    for (const textNode of textNodes) {
      const textElementNode = await this.extractTextNode(textNode, parentRect);
      if (textElementNode) {
        children.push(textElementNode);
      }
    }

    for (const child of htmlChildren) {
      if (!(child instanceof HTMLElement) || child.hidden) continue;
      if (child.offsetWidth === 0 && child.offsetHeight === 0) continue;

      const childNode = await this.extractElement(child, parentRect);
      children.push(childNode);
    }

    return children;
  }

  private async extractTextNode(textNode: Text, parentRect: DOMRect): Promise<ElementNode> {
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rect = range.getBoundingClientRect();
    range.detach();

    const parentElement = textNode.parentElement || document.body;
    const computed = window.getComputedStyle(parentElement);

    const id = `node-${this.elementCounter++}`;
    const characters = (textNode.textContent || '').replace(/\s+/g, ' ').trim();

    const node: ElementNode = {
      id,
      type: 'TEXT',
      name: 'text',
      htmlTag: '#text',
      cssClasses: parentElement.classList ? Array.from(parentElement.classList) : [],
      cssId: parentElement.id || undefined,
      dataAttributes: {},
      ariaLabel: undefined,
      layout: {
        x: rect.left - parentRect.left,
        y: rect.top - parentRect.top,
        width: rect.width,
        height: rect.height
      },
      absoluteLayout: {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
        height: rect.height
      },
      children: [],
      position: this.mapPosition(computed.position),
      display: computed.display,
      visibility: this.mapVisibility(computed.visibility),
      pointerEvents: computed.pointerEvents || undefined,
      overflow: {
        horizontal: this.mapOverflow(computed.overflowX),
        vertical: this.mapOverflow(computed.overflowY)
      },
      zIndex: this.parseZIndex(computed.zIndex),
      isStackingContext: false,
      characters,
      textStyle: this.extractTextStyle(computed),
      fills: [{ type: 'SOLID', color: this.parseColor(computed.color), opacity: this.parseColor(computed.color).a }],
      strokes: undefined
    };

    if (node.textStyle) {
      const segment: InlineTextSegment = {
        id: `${id}-segment-0`,
        characters,
        textStyle: node.textStyle,
        layout: {
          x: 0,
          y: 0,
          width: rect.width,
          height: rect.height
        }
      };
      node.inlineTextSegments = [segment];
    }

    node.contentHash = this.createContentHash(node);
    return node;
  }

  private determineNodeType(
    element: Element,
    computed: CSSStyleDeclaration
  ): ElementNode['type'] {
    if (element instanceof HTMLImageElement) return 'IMAGE';
    if (element instanceof SVGElement) return 'VECTOR';
    if (
      element instanceof HTMLElement &&
      this.isTextLike(element, computed)
    ) {
      return 'TEXT';
    }

    return 'FRAME';
  }

  private isTextLike(element: HTMLElement, computed: CSSStyleDeclaration): boolean {
    const hasOnlyTextChildren = Array.from(element.childNodes).every((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || '').trim().length > 0;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const childEl = node as HTMLElement;
        return childEl.tagName.toLowerCase() === 'br';
      }
      return false;
    });

    if (hasOnlyTextChildren) return true;

    const display = computed.display;
    const tag = element.tagName.toLowerCase();

    return (
      tag === 'span' ||
      tag === 'label' ||
      tag === 'p' ||
      tag === 'h1' ||
      tag === 'h2' ||
      tag === 'h3' ||
      tag === 'h4' ||
      tag === 'h5' ||
      tag === 'h6' ||
      display === 'inline'
    );
  }

  private extractAutoLayout(
    computed: CSSStyleDeclaration
  ): NonNullable<ElementNode['autoLayout']> {
    return {
      layoutMode: computed.flexDirection.includes('column')
        ? 'VERTICAL'
        : 'HORIZONTAL',
      primaryAxisAlignItems: this.mapJustifyContent(computed.justifyContent),
      counterAxisAlignItems: this.mapAlignItems(computed.alignItems),
      paddingTop: parseFloat(computed.paddingTop) || 0,
      paddingRight: parseFloat(computed.paddingRight) || 0,
      paddingBottom: parseFloat(computed.paddingBottom) || 0,
      paddingLeft: parseFloat(computed.paddingLeft) || 0,
      itemSpacing: parseFloat(
        (computed as any).gap || (computed as any).rowGap || '0'
      ) || 0,
      layoutGrow: parseFloat(computed.flexGrow) || 0,
      layoutAlign: this.mapAlignSelf(computed.alignSelf)
    };
  }

  private extractFills(
    computed: CSSStyleDeclaration,
    element: HTMLElement
  ): Fill[] {
    const fills: Fill[] = [];

    if (
      computed.backgroundColor &&
      computed.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
      computed.backgroundColor !== 'transparent'
    ) {
      fills.push({
        type: 'SOLID',
        color: this.parseColor(computed.backgroundColor),
        visible: true,
        opacity: this.parseColor(computed.backgroundColor).a
      });
    }

    if (computed.backgroundImage && computed.backgroundImage !== 'none') {
      const backgroundImages = this.splitBackgroundList(computed.backgroundImage);
      backgroundImages.forEach((backgroundImage, index) => {
        const trimmed = backgroundImage.trim();
        if (trimmed.startsWith('linear-gradient')) {
          const gradient = this.parseLinearGradient(trimmed);
          if (gradient) {
            this.registerGradient(gradient);
            fills.push({
              type: 'GRADIENT_LINEAR',
              gradientStops: gradient.stops,
              gradientTransform: gradient.transform,
              visible: true
            });
          }
        } else if (trimmed.startsWith('radial-gradient')) {
          const gradient = this.parseLinearGradient(trimmed, true);
          if (gradient) {
            this.registerGradient(gradient);
            fills.push({
              type: 'GRADIENT_RADIAL',
              gradientStops: gradient.stops,
              gradientTransform: gradient.transform,
              visible: true
            });
          }
        } else if (trimmed.startsWith('url(')) {
          const url = this.extractUrl(trimmed);
          if (url) {
            const hash = this.hashString(url);
            fills.push({
              type: 'IMAGE',
              imageHash: hash,
              scaleMode: this.mapBackgroundSize(computed.backgroundSize),
              visible: true
            });
            this.registerBackgroundImage(url);
          }
        }
      });
    }

    return fills;
  }

  private extractStrokes(computed: CSSStyleDeclaration): Stroke[] | undefined {
    const strokeWidth = parseFloat(computed.borderWidth || '0');
    if (!strokeWidth || strokeWidth <= 0) return undefined;

    const color =
      computed.borderColor && computed.borderColor !== 'transparent'
        ? this.parseColor(computed.borderColor)
        : undefined;

    return [
      {
        type: 'SOLID',
        color,
        opacity: color?.a,
        thickness: strokeWidth,
        strokeAlign: 'INSIDE'
      }
    ];
  }

  private extractStrokeWeight(computed: CSSStyleDeclaration): number | undefined {
    const width = parseFloat(computed.borderWidth || '0');
    return width > 0 ? width : undefined;
  }

  private extractStrokeAlign(
    computed: CSSStyleDeclaration
  ): ElementNode['strokeAlign'] | undefined {
    const style = computed.borderStyle;
    return style && style !== 'none' ? 'INSIDE' : undefined;
  }

  private extractEffects(computed: CSSStyleDeclaration) {
    const effects = [];

    if (computed.boxShadow && computed.boxShadow !== 'none') {
      const shadows = this.parseBoxShadow(computed.boxShadow);
      effects.push(...shadows);
    }

    if (computed.filter && computed.filter !== 'none') {
      const blurMatch = computed.filter.match(/blur\(([\d.]+)px\)/);
      if (blurMatch) {
        effects.push({
          type: 'LAYER_BLUR' as const,
          visible: true,
          radius: parseFloat(blurMatch[1])
        });
      }
    }

    return effects.length ? effects : undefined;
  }

  private extractCornerRadius(
    computed: CSSStyleDeclaration
  ): ElementNode['cornerRadius'] | undefined {
    const topLeft = parseFloat(computed.borderTopLeftRadius || '0');
    const topRight = parseFloat(computed.borderTopRightRadius || '0');
    const bottomRight = parseFloat(computed.borderBottomRightRadius || '0');
    const bottomLeft = parseFloat(computed.borderBottomLeftRadius || '0');

    if (topLeft || topRight || bottomRight || bottomLeft) {
      return {
        topLeft,
        topRight,
        bottomRight,
        bottomLeft
      };
    }
    return undefined;
  }

  private extractTextStyle(computed: CSSStyleDeclaration): TextStyle {
    const fontFamily = (computed.fontFamily || 'Inter')
      .split(',')
      .map((f) => f.replace(/['"]/g, '').trim())[0];

    const fontWeight = this.parseFontWeight(computed.fontWeight);

    return {
      fontFamily,
      fontWeight,
      fontSize: parseFloat(computed.fontSize || '16'),
      lineHeight: this.parseLineHeight(computed.lineHeight, computed.fontSize),
      letterSpacing: this.parseLetterSpacing(computed.letterSpacing),
      textAlignHorizontal: this.mapTextAlign(computed.textAlign),
      textAlignVertical: 'TOP',
      textCase: this.mapTextTransform(computed.textTransform),
      textDecoration: this.mapTextDecoration(computed.textDecoration),
      fills:
        computed.color && computed.color !== 'transparent'
          ? [
              {
                type: 'SOLID',
                color: this.parseColor(computed.color),
                opacity: this.parseColor(computed.color).a
              }
            ]
          : []
    };
  }

  private extractVectorData(svg: SVGElement) {
    const serializer = new XMLSerializer();
    const svgCode = serializer.serializeToString(svg);
    const hash = this.hashString(svgCode);

    this.assetRegistry.svgs[hash] = {
      hash,
      svgCode,
      width: this.getSvgDimension(svg, 'width'),
      height: this.getSvgDimension(svg, 'height')
    };

    return {
      svgPath: svgCode,
      svgCode,
      fills: []
    };
  }

  private getSvgDimension(svg: SVGElement, dimension: 'width' | 'height'): number {
    if (svg instanceof SVGSVGElement && svg.viewBox) {
      const base = svg.viewBox.baseVal;
      return dimension === 'width' ? base.width : base.height;
    }

    const attr = svg.getAttribute(dimension);
    if (attr) {
      const parsed = parseFloat(attr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    if ((svg as SVGGraphicsElement).getBBox) {
      const bbox = (svg as SVGGraphicsElement).getBBox();
      return dimension === 'width' ? bbox.width : bbox.height;
    }

    return dimension === 'width' ? svg.clientWidth : svg.clientHeight;
  }

  private extractRotation(computed: CSSStyleDeclaration): number | undefined {
    const transform = computed.transform;
    if (!transform || transform === 'none') return undefined;

    const match = transform.match(/matrix\(([-\d.,\s]+)\)/);
    if (!match) return undefined;

    const values = match[1].split(',').map((v) => parseFloat(v.trim()));
    if (values.length < 4 || isNaN(values[0]) || isNaN(values[1])) return undefined;

    const angle = Math.round(Math.atan2(values[1], values[0]) * (180 / Math.PI));
    return angle;
  }

  private parseColor(colorString: string): RGBA {
    const ctx = DOMExtractor.getCanvasContext();
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = colorString;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r: r / 255, g: g / 255, b: b / 255, a: a / 255 };
  }

  private parseLinearGradient(
    gradient: string,
    radial = false
  ): GradientDefinition | null {
    const temp = document.createElement('div');
    temp.style.backgroundImage = gradient;
    document.body.appendChild(temp);
    const styles = window.getComputedStyle(temp);
    const image = styles.backgroundImage;
    document.body.removeChild(temp);
    if (!image || image === 'none') return null;

    const stopsMatches = gradient.match(/rgba?\([^)]+\)\s*[\d.]*%?/g);
    if (!stopsMatches) return null;

    const stops = stopsMatches.map((stop) => {
      const [colorPart, positionPart] = stop.split(/\s+(?=[\d.]+%?)/);
      const color = this.parseColor(colorPart.trim());
      const position = positionPart ? parseFloat(positionPart) / 100 : 0;
      return { color, position: isNaN(position) ? 0 : position };
    });

    return {
      type: radial ? 'radial' : 'linear',
      stops,
      transform: [
        [1, 0, 0],
        [0, 1, 0]
      ]
    };
  }

  private parseBoxShadow(boxShadow: string) {
    const definitions = boxShadow.split(/,(?![^(]*\))/);
    const effects = [];

    for (const def of definitions) {
      const inset = def.includes('inset');
      const values = def
        .replace('inset', '')
        .trim()
        .split(/\s+/);

      if (values.length < 3) continue;
      const [offsetX, offsetY, blurRadius, spread, color] = values;

      const effect = {
        type: inset ? ('INNER_SHADOW' as const) : ('DROP_SHADOW' as const),
        visible: true,
        radius: parseFloat(blurRadius || '0') || 0,
        color: this.parseColor(color || 'rgba(0,0,0,0.25)'),
        offset: {
          x: parseFloat(offsetX || '0') || 0,
          y: parseFloat(offsetY || '0') || 0
        },
        spread: parseFloat(spread || '0') || 0,
        blendMode: 'NORMAL' as const
      };

      effects.push(effect);
    }

    return effects;
  }

  private parseFontWeight(weight: string): number {
    if (!weight) return 400;
    const numeric = parseInt(weight, 10);
    if (!isNaN(numeric)) return numeric;
    const map: Record<string, number> = {
      thin: 100,
      'extra-light': 200,
      light: 300,
      normal: 400,
      regular: 400,
      medium: 500,
      'semi-bold': 600,
      bold: 700,
      'extra-bold': 800,
      black: 900
    };
    return map[weight.toLowerCase()] || 400;
  }

  private parseLineHeight(
    lineHeight: string,
    fontSize: string
  ): TextStyle['lineHeight'] {
    if (!lineHeight || lineHeight === 'normal') {
      return { value: 0, unit: 'AUTO' };
    }
    if (lineHeight.endsWith('%')) {
      return { value: parseFloat(lineHeight), unit: 'PERCENT' };
    }
    if (lineHeight.endsWith('px')) {
      return { value: parseFloat(lineHeight), unit: 'PIXELS' };
    }

    const asNumber = parseFloat(lineHeight);
    if (!isNaN(asNumber)) {
      const fontSizeValue = parseFloat(fontSize || '16');
      return { value: asNumber * fontSizeValue, unit: 'PIXELS' };
    }

    return { value: 0, unit: 'AUTO' };
  }

  private parseLetterSpacing(letterSpacing: string): TextStyle['letterSpacing'] {
    if (!letterSpacing || letterSpacing === 'normal') {
      return { value: 0, unit: 'PIXELS' };
    }
    if (letterSpacing.endsWith('%')) {
      return { value: parseFloat(letterSpacing), unit: 'PERCENT' };
    }
    return { value: parseFloat(letterSpacing), unit: 'PIXELS' };
  }

  private mapJustifyContent(
    value: string
  ): NonNullable<ElementNode['autoLayout']>['primaryAxisAlignItems'] {
    const map: Record<string, any> = {
      'flex-start': 'MIN',
      center: 'CENTER',
      'flex-end': 'MAX',
      'space-between': 'SPACE_BETWEEN',
      'space-around': 'CENTER',
      'space-evenly': 'CENTER'
    };
    return map[value] || 'MIN';
  }

  private mapAlignItems(
    value: string
  ): NonNullable<ElementNode['autoLayout']>['counterAxisAlignItems'] {
    const map: Record<string, any> = {
      stretch: 'STRETCH',
      'flex-start': 'MIN',
      center: 'CENTER',
      'flex-end': 'MAX'
    };
    return map[value] || 'MIN';
  }

  private mapAlignSelf(
    value: string
  ): NonNullable<ElementNode['autoLayout']>['layoutAlign'] {
    const map: Record<string, NonNullable<ElementNode['autoLayout']>['layoutAlign']> = {
      stretch: 'STRETCH',
      auto: 'INHERIT'
    };
    return map[value] || 'INHERIT';
  }

  private mapTextAlign(textAlign: string): TextStyle['textAlignHorizontal'] {
    const map: Record<string, TextStyle['textAlignHorizontal']> = {
      left: 'LEFT',
      start: 'LEFT',
      center: 'CENTER',
      right: 'RIGHT',
      end: 'RIGHT',
      justify: 'JUSTIFIED'
    };
    return map[textAlign] || 'LEFT';
  }

  private mapTextTransform(transform: string): TextStyle['textCase'] {
    const map: Record<string, TextStyle['textCase']> = {
      uppercase: 'UPPER',
      lowercase: 'LOWER',
      capitalize: 'TITLE'
    };
    return map[transform] || 'ORIGINAL';
  }

  private mapTextDecoration(decoration: string): TextStyle['textDecoration'] {
    const map: Record<string, TextStyle['textDecoration']> = {
      'line-through': 'STRIKETHROUGH',
      underline: 'UNDERLINE'
    };
    return map[decoration] || 'NONE';
  }

  private mapBlendMode(value: string): ElementNode['blendMode'] {
    const map: Record<string, ElementNode['blendMode']> = {
      normal: 'NORMAL',
      multiply: 'MULTIPLY',
      screen: 'SCREEN',
      overlay: 'OVERLAY',
      darken: 'DARKEN',
      lighten: 'LIGHTEN'
    };
    return map[value] || 'NORMAL';
  }

  private extractOutline(computed: CSSStyleDeclaration): OutlineData | undefined {
    if (!computed.outlineStyle || computed.outlineStyle === 'none') return undefined;
    const width = parseFloat(computed.outlineWidth || '0');
    if (!width) return undefined;
    return {
      color: this.parseColor(computed.outlineColor || 'rgba(0,0,0,1)'),
      width,
      style: (computed.outlineStyle as OutlineData['style']) || 'solid'
    };
  }

  private mapBackgroundSize(size: string): Fill['scaleMode'] {
    const map: Record<string, Fill['scaleMode']> = {
      contain: 'FIT',
      cover: 'FILL'
    };
    return map[size] || 'FILL';
  }

  private extractBackgroundLayers(
    computed: CSSStyleDeclaration,
    _element: HTMLElement,
    fills: Fill[] | undefined
  ): BackgroundLayer[] | undefined {
    if (!fills || fills.length === 0) return undefined;

    const repeatValue = computed.backgroundRepeat || undefined;
    const clipValue = (computed as any).backgroundClip || undefined;
    const originValue = (computed as any).backgroundOrigin || undefined;
    const attachmentValue = (computed as any).backgroundAttachment || undefined;
    const positionX = (computed as any).backgroundPositionX || computed.backgroundPosition;
    const positionY = (computed as any).backgroundPositionY || computed.backgroundPosition;
    const sizeValue = computed.backgroundSize;

    const positionXList = this.splitBackgroundList(positionX);
    const positionYList = this.splitBackgroundList(positionY);
    const sizeList = this.splitBackgroundList(sizeValue);
    const repeatList = this.splitBackgroundList(repeatValue);
    const clipList = this.splitBackgroundList(clipValue);
    const originList = this.splitBackgroundList(originValue);
    const attachmentList = this.splitBackgroundList(attachmentValue);

    const layers: BackgroundLayer[] = [];
    fills.forEach((fill, index) => {
      const layer: BackgroundLayer = {
        type: fill.type === 'SOLID' ? 'color' : fill.type === 'IMAGE' ? 'image' : 'gradient',
        fill,
        position:
          positionXList[index] || positionYList[index]
            ? {
                x: positionXList[index] || '0%',
                y: positionYList[index] || '0%'
              }
            : undefined,
        size: sizeList[index] ? this.parseBackgroundSize(sizeList[index]) : undefined,
        repeat: repeatList[index] || repeatValue || undefined,
        clip: clipList[index] || clipValue || undefined,
        origin: originList[index] || originValue || undefined,
        attachment: attachmentList[index] || attachmentValue || undefined
      };
      layers.push(layer);
    });

    return layers.length ? layers : undefined;
  }

  private splitBackgroundList(value: string | undefined): string[] {
    if (!value) return [];
    const result: string[] = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim().length) {
      result.push(current.trim());
    }
    return result;
  }

  private extractUrl(backgroundImage: string): string | null {
    const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : null;
  }

  private registerGradient(definition: GradientDefinition): string {
    const serialized = JSON.stringify(definition);
    const hash = this.hashString(`gradient-${serialized}`);
    if (!this.assetRegistry.gradients) {
      this.assetRegistry.gradients = {};
    }
    if (!this.assetRegistry.gradients[hash]) {
      const asset: GradientAsset = {
        hash,
        type: definition.type,
        stops: definition.stops,
        transform: definition.transform
      };
      this.assetRegistry.gradients[hash] = asset;
    }
    return hash;
  }

  private async registerBackgroundImage(url: string) {
    const hash = this.hashString(url);
    if (this.assetRegistry.images[hash]) return;

    const asset: ImageAssetPartial = {
      hash,
      url,
      width: 0,
      height: 0,
      mimeType: this.getMimeType(url)
    };

    try {
      const data = await this.fetchImageAsBase64(url);
      asset.base64 = data.base64;
      asset.width = data.width;
      asset.height = data.height;
    } catch (error) {
      console.warn('Unable to fetch background image', url, error);
    }

    this.assetRegistry.images[hash] = asset;
  }

  private async registerImage(
    url: string,
    width: number,
    height: number
  ): Promise<string> {
    const hash = this.hashString(url);
    if (!this.assetRegistry.images[hash]) {
      const asset: ImageAssetPartial = {
        hash,
        url,
        width,
        height,
        mimeType: this.getMimeType(url)
      };

      try {
        const data = await this.fetchImageAsBase64(url);
        asset.base64 = data.base64;
        asset.width = data.width || width;
        asset.height = data.height || height;
      } catch (error) {
        console.warn('Failed to fetch image asset', url, error);
      }

      this.assetRegistry.images[hash] = asset;
    }
    return hash;
  }

  private async fetchImageAsBase64(url: string): Promise<{
    base64: string;
    width: number;
    height: number;
  }> {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    const base64 = await this.blobToBase64(blob);
    const dimensions = await this.measureImage(blob);

    return {
      base64,
      width: dimensions.width,
      height: dimensions.height
    };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private measureImage(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = URL.createObjectURL(blob);
    });
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml'
    };
    return extension ? map[extension] || 'image/png' : 'image/png';
  }

  private parseBackgroundSize(value: string): { width: string; height: string } | undefined {
    if (!value) return undefined;
    const parts = value.split(/\s+/);
    if (parts.length === 1) {
      return { width: parts[0], height: parts[0] };
    }
    return { width: parts[0], height: parts[1] };
  }

  private mapPosition(value: string): ElementNode['position'] {
    switch ((value || '').toLowerCase()) {
      case 'relative':
      case 'absolute':
      case 'fixed':
      case 'sticky':
        return value as ElementNode['position'];
      default:
        return 'static';
    }
  }

  private mapVisibility(value: string): ElementNode['visibility'] {
    switch ((value || '').toLowerCase()) {
      case 'hidden':
        return 'hidden';
      case 'collapse':
        return 'collapse';
      default:
        return 'visible';
    }
  }

  private mapOverflow(value: string): NonNullable<ElementNode['overflow']>['horizontal'] {
    switch ((value || '').toLowerCase()) {
      case 'hidden':
      case 'scroll':
      case 'auto':
      case 'clip':
        return value as NonNullable<ElementNode['overflow']>['horizontal'];
      default:
        return 'visible';
    }
  }

  private parseZIndex(value: string): number | undefined {
    if (!value || value === 'auto') return undefined;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseOptionalNumber(value: string | null | undefined): number | undefined {
    if (!value || value === 'auto' || value === 'none' || value === '0') {
      return undefined;
    }
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private detectStackingContext(element: Element, computed: CSSStyleDeclaration): boolean {
    if (!(element instanceof HTMLElement)) return false;
    const position = computed.position;
    const zIndex = this.parseZIndex(computed.zIndex);
    const opacity = parseFloat(computed.opacity || '1');
    const transform = computed.transform;
    const mixBlendMode = computed.mixBlendMode;
    const filter = computed.filter;
    const isolation = (computed as any).isolation;
    const willChange = (computed as any).willChange || '';

    if ((position === 'absolute' || position === 'relative' || position === 'fixed' || position === 'sticky') && zIndex !== undefined) {
      return true;
    }

    if (opacity < 1) return true;
    if (transform && transform !== 'none') return true;
    if (mixBlendMode && mixBlendMode !== 'normal') return true;
    if (filter && filter !== 'none') return true;
    if (isolation === 'isolate') return true;
    if (willChange.includes('transform') || willChange.includes('opacity') || willChange.includes('filter')) return true;

    const parent = element.parentElement;
    if (parent) {
      const parentComputed = window.getComputedStyle(parent);
      if (parentComputed.transform !== 'none' || parentComputed.filter !== 'none') {
        return true;
      }
    }

    return false;
  }

  private extractTransform(transform: string): TransformData | undefined {
    if (!transform || transform === 'none') {
      return undefined;
    }

    if (transform.startsWith('matrix3d')) {
      const values = transform
        .match(/matrix3d\(([^)]+)\)/)![1]
        .split(',')
        .map((v) => parseFloat(v.trim()))
        .filter((v) => Number.isFinite(v));

      return {
        matrix: values,
        translate: { x: values[12] || 0, y: values[13] || 0, z: values[14] || 0 },
        scale: { x: values[0] || 1, y: values[5] || 1, z: values[10] || 1 }
      };
    }

    const match = transform.match(/matrix\(([^)]+)\)/);
    if (!match) return undefined;
    const values = match[1]
      .split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((v) => Number.isFinite(v));

    if (values.length !== 6) {
      return { matrix: values };
    }

    const [a, b, c, d, tx, ty] = values;
    const scaleX = Math.hypot(a, b) || 1;
    const scaleY = Math.hypot(c, d) || 1;
    const rotation = Math.atan2(b, a) * (180 / Math.PI);
    const skewX = Math.atan2(a * c + b * d, scaleX * scaleX) * (180 / Math.PI);

    return {
      matrix: values,
      translate: { x: tx, y: ty },
      scale: { x: scaleX, y: scaleY },
      rotate: { x: 0, y: 0, z: 1, angle: rotation },
      skew: { x: skewX, y: 0 }
    };
  }

  private extractTransformOrigin(origin: string): { x: number; y: number; z?: number } | undefined {
    if (!origin) return undefined;
    const parts = origin.split(' ');
    const x = this.parseTransformOriginValue(parts[0]);
    const y = this.parseTransformOriginValue(parts[1]);
    const z = parts[2] ? this.parseTransformOriginValue(parts[2]) : undefined;
    if (x === undefined || y === undefined) return undefined;
    return { x, y, z };
  }

  private parseTransformOriginValue(value?: string): number | undefined {
    if (!value) return undefined;
    if (value.endsWith('%')) {
      return parseFloat(value);
    }
    if (value.endsWith('px')) {
      return parseFloat(value);
    }
    const lookup: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
    return lookup[value] ?? parseFloat(value);
  }

  private parseFilters(value: string): FilterData[] | undefined {
    if (!value || value === 'none') return undefined;
    const filters: FilterData[] = [];
    const regex = /(\w+-?\w*)\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value))) {
      const type = match[1];
      const raw = match[2].trim();
      switch (type) {
        case 'drop-shadow': {
          const parts = raw.split(/\s+/);
          const offsetX = parseFloat(parts[0] || '0');
          const offsetY = parseFloat(parts[1] || '0');
          const blur = parseFloat(parts[2] || '0');
          const colorString = parts.slice(3).join(' ') || 'rgba(0,0,0,0.5)';
          filters.push({
            type: 'dropShadow',
            value: blur,
            unit: 'px',
            offset: { x: offsetX, y: offsetY },
            color: this.parseColor(colorString)
          });
          break;
        }
        case 'blur':
          filters.push({ type: 'blur', value: parseFloat(raw), unit: raw.endsWith('px') ? 'px' : undefined });
          break;
        case 'brightness':
        case 'contrast':
        case 'grayscale':
        case 'invert':
        case 'opacity':
        case 'saturate':
        case 'sepia':
          filters.push({ type: type as FilterData['type'], value: parseFloat(raw), unit: raw.endsWith('%') ? '%' : undefined });
          break;
        case 'hue-rotate':
          filters.push({ type: 'hueRotate', value: parseFloat(raw), unit: 'deg' });
          break;
      }
    }

    return filters.length ? filters : undefined;
  }

  private extractClipPath(value: string): ClipPathData | undefined {
    if (!value || value === 'none') return undefined;
    const typeMatch = value.split('(')[0].trim();
    const allowed: ClipPathData['type'][] = ['circle', 'ellipse', 'inset', 'polygon', 'path', 'url'];
    const type = (allowed.includes(typeMatch as ClipPathData['type']) ? typeMatch : 'path') as ClipPathData['type'];
    return { type, value };
  }

  private extractMask(image: string, clip: string, mode: string): MaskData | undefined {
    if ((!image || image === 'none') && (!clip || clip === 'auto')) return undefined;
    let type: MaskData['type'] = 'none';
    if (image && image.startsWith('url(')) {
      type = 'url';
    } else if (mode === 'luminance') {
      type = 'luminance';
    } else if (mode === 'alpha') {
      type = 'alpha';
    }
    return {
      type,
      value: image && image !== 'none' ? image : clip
    };
  }

  private extractScrollData(element: HTMLElement): ScrollData | undefined {
    const scrollWidth = element.scrollWidth;
    const scrollHeight = element.scrollHeight;
    const scrollTop = element.scrollTop;
    const scrollLeft = element.scrollLeft;

    if (scrollWidth <= element.clientWidth && scrollHeight <= element.clientHeight && scrollTop === 0 && scrollLeft === 0) {
      return undefined;
    }

    return {
      scrollWidth,
      scrollHeight,
      scrollTop,
      scrollLeft,
      overscrollBehaviorX: (element as any).style?.overscrollBehaviorX,
      overscrollBehaviorY: (element as any).style?.overscrollBehaviorY
    };
  }

  private collectCustomProperties(computed: CSSStyleDeclaration): Record<string, string> | undefined {
    const custom: Record<string, string> = {};
    for (let i = 0; i < computed.length; i++) {
      const name = computed[i];
      if (name && name.startsWith('--')) {
        custom[name] = computed.getPropertyValue(name);
      }
    }
    return Object.keys(custom).length ? custom : undefined;
  }

  private buildInlineTextSegments(element: HTMLElement, node: ElementNode): InlineTextSegment[] {
    if (!node.textStyle) return [];
    const text = element.innerText || '';
    if (!text.trim()) return [];
    return [
      {
        id: `${node.id}-segment-0`,
        characters: text,
        textStyle: node.textStyle,
        layout: {
          x: 0,
          y: 0,
          width: node.layout.width,
          height: node.layout.height
        }
      }
    ];
  }

  private createComponentSignature(element: Element, node: ElementNode): string | undefined {
    if (!(element instanceof HTMLElement)) return undefined;
    const signature = [
      node.htmlTag,
      element.id || '',
      element.className || '',
      Object.keys(element.dataset || {}).sort().join(','),
      node.fills?.length || 0,
      node.children.length
    ].join('|');
    return this.hashString(signature);
  }

  private createContentHash(node: ElementNode): string {
    const payload = {
      type: node.type,
      layout: node.layout,
      fills: node.fills,
      strokes: node.strokes,
      effects: node.effects,
      textStyle: node.textStyle,
      characters: node.characters,
      backgrounds: node.backgrounds,
      transform: node.transform
    };
    return this.hashString(JSON.stringify(payload));
  }

  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return 'asset-0';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `asset-${Math.abs(hash).toString(16)}`;
  }

  private generateSemanticName(element: Element): string {
    const ariaLabel = element.getAttribute?.('aria-label');
    if (ariaLabel) return ariaLabel;

    const dataTestId = element.getAttribute?.('data-testid');
    if (dataTestId) return dataTestId;

    const elementId = (element as HTMLElement).id;
    if (elementId) return elementId;

    const mainClass = element.classList?.[0];
    if (mainClass) return mainClass;

    return element.tagName.toLowerCase();
  }

  private registerStyles(node: ElementNode) {
    if (node.fills) {
      node.fills.forEach((fill) => {
        if (fill.type === 'SOLID' && fill.color) {
          const key = `${fill.color.r}-${fill.color.g}-${fill.color.b}-${fill.color.a}`;
          const existing = this.styleRegistry.colors[key];
          if (existing) {
            existing.usageCount += 1;
          } else {
            const style: ColorStyle = {
              id: key,
              name: `Color/${Math.round(fill.color.r * 255)},${Math.round(
                fill.color.g * 255
              )},${Math.round(fill.color.b * 255)}`,
              color: fill.color,
              usageCount: 1
            };
            this.styleRegistry.colors[key] = style;
          }
        }
      });
    }

    if (node.textStyle) {
      const key = `${node.textStyle.fontFamily}-${node.textStyle.fontWeight}-${node.textStyle.fontSize}`;
      if (!this.styleRegistry.textStyles[key]) {
        this.styleRegistry.textStyles[key] = node.textStyle;
      }
    }
  }

  private registerFontUsage(textStyle?: TextStyle) {
    if (!textStyle) return;
    const entry = this.fontUsage.get(textStyle.fontFamily) || {
      fontFamily: textStyle.fontFamily,
      weights: new Set<number>()
    };
    entry.weights.add(textStyle.fontWeight);
    this.fontUsage.set(textStyle.fontFamily, entry);
  }

  private buildFontDefinitions(): FontDefinition[] {
    const fonts: FontDefinition[] = [];
    this.fontUsage.forEach((usage) => {
      fonts.push({
        family: usage.fontFamily,
        weights: Array.from(usage.weights),
        source: 'system'
      });
    });
    return fonts;
  }

  private static getCanvasContext(): CanvasRenderingContext2D {
    if (!(window as any).__webToFigmaCanvas) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      (window as any).__webToFigmaCanvas = canvas.getContext('2d');
    }
    return (window as any).__webToFigmaCanvas;
  }
}

type ImageAssetPartial = {
  hash: string;
  url: string;
  base64?: string;
  width: number;
  height: number;
  mimeType: string;
};
