import { Fill, Stroke, Effect, TextStyle, CornerRadius, RGBA, GradientStop, BlendMode } from '../types/schema';

export class StyleParser {
  extractFills(computed: CSSStyleDeclaration, element: Element | null): Fill[] {
    const fills: Fill[] = [];

    const bgColor = computed.backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      fills.push({
        type: 'SOLID',
        color: this.parseColor(bgColor),
        visible: true,
        opacity: 1
      });
    }

    const bgImage = computed.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      if (bgImage.startsWith('linear-gradient')) {
        const gradient = this.parseLinearGradient(bgImage);
        if (gradient) fills.push(gradient);
      } else if (bgImage.startsWith('radial-gradient')) {
        const gradient = this.parseRadialGradient(bgImage);
        if (gradient) fills.push(gradient);
      } else if (bgImage.startsWith('url(')) {
        const url = this.extractURL(bgImage);
        if (url) {
          fills.push({
            type: 'IMAGE',
            imageHash: this.hashString(url),
            scaleMode: this.mapBackgroundSize(computed.backgroundSize),
            visible: true,
            opacity: 1
          });
        }
      }
    }

    return fills;
  }

  extractStrokes(computed: CSSStyleDeclaration): Stroke[] {
    const strokes: Stroke[] = [];
    
    const borderWidth = parseFloat(computed.borderWidth);
    if (borderWidth > 0) {
      const borderColor = computed.borderColor;
      if (borderColor && borderColor !== 'transparent') {
        strokes.push({
          type: 'SOLID',
          color: this.parseColor(borderColor),
          thickness: borderWidth,
          strokeAlign: 'INSIDE',
          opacity: 1
        });
      }
    }

    return strokes;
  }

  extractEffects(computed: CSSStyleDeclaration): Effect[] {
    const effects: Effect[] = [];

    const boxShadow = computed.boxShadow;
    if (boxShadow && boxShadow !== 'none') {
      const shadows = this.parseBoxShadow(boxShadow);
      effects.push(...shadows);
    }

    const filter = computed.filter;
    if (filter && filter !== 'none') {
      const blurMatch = filter.match(/blur\((\d+(?:\.\d+)?)px\)/);
      if (blurMatch) {
        effects.push({
          type: 'LAYER_BLUR',
          visible: true,
          radius: parseFloat(blurMatch[1])
        });
      }

      const dropShadowMatch = filter.match(/drop-shadow\(([^)]+)\)/);
      if (dropShadowMatch) {
        const parts = dropShadowMatch[1].trim().split(/\s+/);
        if (parts.length >= 3) {
          effects.push({
            type: 'DROP_SHADOW',
            visible: true,
            offset: { x: parseFloat(parts[0]), y: parseFloat(parts[1]) },
            radius: parseFloat(parts[2]),
            color: this.parseColor(parts[3] || 'rgba(0,0,0,0.25)'),
            blendMode: 'NORMAL'
          });
        }
      }
    }

    return effects;
  }

  extractTextStyle(computed: CSSStyleDeclaration): TextStyle {
    return {
      fontFamily: this.extractFontFamily(computed.fontFamily),
      fontWeight: this.parseFontWeight(computed.fontWeight),
      fontSize: parseFloat(computed.fontSize),
      lineHeight: this.parseLineHeight(computed.lineHeight, computed.fontSize),
      letterSpacing: this.parseLetterSpacing(computed.letterSpacing),
      textAlignHorizontal: this.mapTextAlign(computed.textAlign),
      textAlignVertical: 'TOP',
      textCase: this.mapTextTransform(computed.textTransform),
      textDecoration: this.mapTextDecoration(computed.textDecoration),
      fills: [{
        type: 'SOLID',
        color: this.parseColor(computed.color),
        visible: true,
        opacity: 1
      }]
    };
  }

  extractCornerRadius(computed: CSSStyleDeclaration): CornerRadius {
    return {
      topLeft: parseFloat(computed.borderTopLeftRadius),
      topRight: parseFloat(computed.borderTopRightRadius),
      bottomRight: parseFloat(computed.borderBottomRightRadius),
      bottomLeft: parseFloat(computed.borderBottomLeftRadius)
    };
  }

  extractBlendMode(computed: CSSStyleDeclaration): BlendMode {
    const mixBlendMode = computed.mixBlendMode;
    const map: Record<string, BlendMode> = {
      'normal': 'NORMAL',
      'multiply': 'MULTIPLY',
      'screen': 'SCREEN',
      'overlay': 'OVERLAY',
      'darken': 'DARKEN',
      'lighten': 'LIGHTEN'
    };
    return map[mixBlendMode] || 'NORMAL';
  }

  parseColor(colorString: string): RGBA {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { r: 0, g: 0, b: 0, a: 1 };
    
    ctx.fillStyle = colorString;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    
    return {
      r: r / 255,
      g: g / 255,
      b: b / 255,
      a: a / 255
    };
  }

  private parseLinearGradient(gradient: string): Fill | null {
    try {
      const match = gradient.match(/linear-gradient\(([^)]+)\)/);
      if (!match) return null;

      const parts = match[1].split(',').map(s => s.trim());
      let angle = 0;
      let colorIndex = 0;

      if (parts[0].includes('deg') || parts[0].includes('turn') || parts[0].includes('rad')) {
        angle = this.parseAngle(parts[0]);
        colorIndex = 1;
      } else if (parts[0].startsWith('to ')) {
        angle = this.parseDirection(parts[0]);
        colorIndex = 1;
      }

      const stops: GradientStop[] = [];
      for (let i = colorIndex; i < parts.length; i++) {
        const stop = this.parseGradientStop(parts[i]);
        if (stop) stops.push(stop);
      }

      if (stops.length < 2) return null;

      return {
        type: 'GRADIENT_LINEAR',
        gradientStops: stops,
        gradientTransform: this.angleToTransform(angle),
        visible: true,
        opacity: 1
      };
    } catch (e) {
      console.warn('Failed to parse linear gradient:', e);
      return null;
    }
  }

  private parseRadialGradient(gradient: string): Fill | null {
    try {
      const match = gradient.match(/radial-gradient\(([^)]+)\)/);
      if (!match) return null;

      const parts = match[1].split(',').map(s => s.trim());
      const stops: GradientStop[] = [];

      const startIndex = parts[0].match(/circle|ellipse|at/) ? 1 : 0;

      for (let i = startIndex; i < parts.length; i++) {
        const stop = this.parseGradientStop(parts[i]);
        if (stop) stops.push(stop);
      }

      if (stops.length < 2) return null;

      return {
        type: 'GRADIENT_RADIAL',
        gradientStops: stops,
        visible: true,
        opacity: 1
      };
    } catch (e) {
      console.warn('Failed to parse radial gradient:', e);
      return null;
    }
  }

  private parseGradientStop(stopString: string): GradientStop | null {
    const parts = stopString.trim().split(/\s+/);
    if (parts.length === 0) return null;

    const colorPart = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
    const position = parts.length > 1 ? this.parsePosition(parts[parts.length - 1]) : null;

    return {
      color: this.parseColor(colorPart),
      position: position !== null ? position : 0.5
    };
  }

  private parsePosition(posString: string): number {
    if (posString.endsWith('%')) {
      return parseFloat(posString) / 100;
    }
    return parseFloat(posString);
  }

  private parseAngle(angleString: string): number {
    if (angleString.endsWith('deg')) {
      return parseFloat(angleString);
    }
    if (angleString.endsWith('turn')) {
      return parseFloat(angleString) * 360;
    }
    if (angleString.endsWith('rad')) {
      return parseFloat(angleString) * (180 / Math.PI);
    }
    return 0;
  }

  private parseDirection(direction: string): number {
    const map: Record<string, number> = {
      'to top': 0,
      'to right': 90,
      'to bottom': 180,
      'to left': 270,
      'to top right': 45,
      'to bottom right': 135,
      'to bottom left': 225,
      'to top left': 315
    };
    return map[direction.toLowerCase()] || 180;
  }

  private angleToTransform(angle: number): [[number, number, number], [number, number, number]] {
    const rad = (angle - 90) * (Math.PI / 180);
    return [
      [Math.cos(rad), Math.sin(rad), 0.5],
      [-Math.sin(rad), Math.cos(rad), 0.5]
    ];
  }

  private parseBoxShadow(boxShadow: string): Effect[] {
    const shadows = boxShadow.split(/,(?![^(]*\))/);
    return shadows.map(shadow => {
      const trimmed = shadow.trim();
      const isInset = trimmed.startsWith('inset');
      const parts = trimmed.replace('inset', '').trim().split(/\s+/);
      
      if (parts.length < 3) return null;

      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const blur = parseFloat(parts[2]);
      const spread = parts.length > 4 ? parseFloat(parts[3]) : 0;
      const color = parts.length > 3 ? parts[parts.length - 1] : 'rgba(0,0,0,0.25)';

      return {
        type: isInset ? 'INNER_SHADOW' : 'DROP_SHADOW',
        visible: true,
        offset: { x, y },
        radius: blur,
        spread,
        color: this.parseColor(color),
        blendMode: 'NORMAL' as BlendMode
      };
    }).filter(Boolean) as Effect[];
  }

  private extractFontFamily(fontFamily: string): string {
    return fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  }

  private parseFontWeight(fontWeight: string): number {
    const weightMap: Record<string, number> = {
      'normal': 400,
      'bold': 700,
      'lighter': 300,
      'bolder': 600
    };
    return weightMap[fontWeight] || parseInt(fontWeight) || 400;
  }

  private parseLineHeight(lineHeight: string, fontSize: string): TextStyle['lineHeight'] {
    if (lineHeight === 'normal') {
      return { value: 1.2, unit: 'PERCENT' };
    }
    
    if (lineHeight.endsWith('px')) {
      return { value: parseFloat(lineHeight), unit: 'PIXELS' };
    }
    
    if (lineHeight.endsWith('%')) {
      return { value: parseFloat(lineHeight), unit: 'PERCENT' };
    }
    
    const multiplier = parseFloat(lineHeight);
    return { value: multiplier * 100, unit: 'PERCENT' };
  }

  private parseLetterSpacing(letterSpacing: string): TextStyle['letterSpacing'] {
    if (letterSpacing === 'normal') {
      return { value: 0, unit: 'PIXELS' };
    }
    
    if (letterSpacing.endsWith('px')) {
      return { value: parseFloat(letterSpacing), unit: 'PIXELS' };
    }
    
    if (letterSpacing.endsWith('em')) {
      return { value: parseFloat(letterSpacing) * 100, unit: 'PERCENT' };
    }
    
    return { value: parseFloat(letterSpacing), unit: 'PIXELS' };
  }

  private mapTextAlign(textAlign: string): TextStyle['textAlignHorizontal'] {
    const map: Record<string, TextStyle['textAlignHorizontal']> = {
      'left': 'LEFT',
      'center': 'CENTER',
      'right': 'RIGHT',
      'justify': 'JUSTIFIED'
    };
    return map[textAlign] || 'LEFT';
  }

  private mapTextTransform(textTransform: string): TextStyle['textCase'] {
    const map: Record<string, TextStyle['textCase']> = {
      'none': 'ORIGINAL',
      'uppercase': 'UPPER',
      'lowercase': 'LOWER',
      'capitalize': 'TITLE'
    };
    return map[textTransform] || 'ORIGINAL';
  }

  private mapTextDecoration(textDecoration: string): TextStyle['textDecoration'] {
    if (textDecoration.includes('underline')) return 'UNDERLINE';
    if (textDecoration.includes('line-through')) return 'STRIKETHROUGH';
    return 'NONE';
  }

  private mapBackgroundSize(backgroundSize: string): Fill['scaleMode'] {
    if (backgroundSize === 'cover') return 'FILL';
    if (backgroundSize === 'contain') return 'FIT';
    return 'CROP';
  }

  private extractURL(urlString: string): string | null {
    const match = urlString.match(/url\(['"]?([^'"()]+)['"]?\)/);
    return match ? match[1] : null;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `asset-${Math.abs(hash).toString(16)}`;
  }
}
