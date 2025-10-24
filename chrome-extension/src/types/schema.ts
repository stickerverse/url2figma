export interface WebToFigmaSchema {
  version: string;
  metadata: PageMetadata;
  tree: ElementNode;
  assets: AssetRegistry;
  styles: StyleRegistry;
  components: ComponentRegistry;
  variants: VariantsRegistry;
  yogaLayout?: YogaLayoutData;
}

export interface VariantsRegistry {
  elements: Record<string, ElementVariants>;
}

export interface ElementVariants {
  elementId: string;
  baseElement: ElementNode;
  states: {
    default: ElementNode;
    hover?: ElementNode;
    focus?: ElementNode;
    active?: ElementNode;
    disabled?: ElementNode;
  };
  position: {
    x: number;
    y: number;
  };
  selector: string;
}

export interface PageMetadata {
  url: string;
  title: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  timestamp: string;
  fonts: FontDefinition[];
  breakpoint?: 'mobile' | 'tablet' | 'desktop';
  captureOptions: CaptureOptions;
  screenshot?: string;
}

export interface CaptureOptions {
  captureHoverStates: boolean;
  captureFocusStates: boolean;
  detectComponents: boolean;
  extractSVGs: boolean;
  captureDepth: 'shallow' | 'medium' | 'deep';
  viewports: ViewportConfig[];
  createVariantsFrame: boolean;
  pixelPerfectMode: boolean;
}

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export interface ElementNode {
  id: string;
  type: 'FRAME' | 'TEXT' | 'RECTANGLE' | 'VECTOR' | 'IMAGE' | 'COMPONENT' | 'INSTANCE';
  name: string;
  
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  
  autoLayout?: {
    layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
    primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    itemSpacing: number;
    layoutGrow?: number;
    layoutAlign?: 'STRETCH' | 'INHERIT';
  };
  
  fills?: Fill[];
  strokes?: Stroke[];
  effects?: Effect[];
  cornerRadius?: CornerRadius;
  opacity?: number;
  blendMode?: BlendMode;
  
  characters?: string;
  textStyle?: TextStyle;
  
  vectorData?: {
    svgPath: string;
    svgCode: string;
    fills: Fill[];
  };
  
  imageHash?: string;
  
  isComponent?: boolean;
  componentId?: string;
  componentKey?: string;
  variants?: VariantData[];
  hasInteractiveStates?: boolean;
  
  pseudoElements?: {
    before?: ElementNode;
    after?: ElementNode;
  };
  
  htmlTag: string;
  cssClasses: string[];
  cssId?: string;
  dataAttributes?: Record<string, string>;
  ariaLabel?: string;
  cssSelector?: string;
  
  children: ElementNode[];
  
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };
  
  interactions?: InteractionData[];
}

export interface Fill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: RGBA;
  gradientStops?: GradientStop[];
  gradientTransform?: Transform2D;
  imageHash?: string;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}

export interface GradientStop {
  position: number;
  color: RGBA;
}

export interface Stroke {
  type: 'SOLID' | 'GRADIENT_LINEAR';
  color?: RGBA;
  opacity?: number;
  thickness: number;
  strokeAlign: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  dashPattern?: number[];
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible: boolean;
  radius: number;
  color?: RGBA;
  offset?: { x: number; y: number };
  spread?: number;
  blendMode?: BlendMode;
}

export interface TextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  letterSpacing: { value: number; unit: 'PIXELS' | 'PERCENT' };
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  fills: Fill[];
}

export interface CornerRadius {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface AssetRegistry {
  images: Record<string, ImageAsset>;
  svgs: Record<string, SVGAsset>;
}

export interface ImageAsset {
  hash: string;
  url: string;
  base64?: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface SVGAsset {
  hash: string;
  svgCode: string;
  width: number;
  height: number;
}

export interface StyleRegistry {
  colors: Record<string, ColorStyle>;
  textStyles: Record<string, TextStyleDefinition>;
  effects: Record<string, Effect[]>;
}

export interface ColorStyle {
  id: string;
  name: string;
  color: RGBA;
  usageCount: number;
}

export interface TextStyleDefinition extends TextStyle {
  id: string;
  name: string;
  usageCount: number;
}

export interface ComponentRegistry {
  components: Record<string, ComponentDefinition>;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  instances: string[];
  baseNode: ElementNode;
  variants?: VariantData[];
}

export interface VariantData {
  state: 'default' | 'hover' | 'focus' | 'active' | 'disabled';
  properties: Partial<ElementNode>;
}

export interface InteractionData {
  trigger: 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS';
  action: 'CHANGE_TO' | 'NAVIGATE';
  destinationId?: string;
  transition?: {
    type: 'DISSOLVE' | 'SMART_ANIMATE' | 'MOVE_IN';
    duration: number;
    easing: string;
  };
}

export interface YogaLayoutData {
  calculatedByYoga: boolean;
  layoutTree: any;
}

export interface FontDefinition {
  family: string;
  weights: number[];
  source: 'google' | 'system' | 'custom';
  url?: string;
}

export type BlendMode = 'NORMAL' | 'MULTIPLY' | 'SCREEN' | 'OVERLAY' | 'DARKEN' | 'LIGHTEN';
export type Transform2D = [[number, number, number], [number, number, number]];

export interface ExtensionMessage {
  type: 'START_CAPTURE' | 'CAPTURE_COMPLETE' | 'CAPTURE_ERROR' | 'PROGRESS_UPDATE';
  data?: any;
  error?: string;
}

export interface CaptureProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}
