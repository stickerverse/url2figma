import { NodeBuilder } from './node-builder';
import { StyleManager } from './style-manager';
import { ComponentManager } from './component-manager';
import { VariantsFrameBuilder } from './variants-frame-builder';
import { DesignSystemBuilder } from './design-system-builder';

export interface ImportOptions {
  createMainFrame: boolean;
  createVariantsFrame: boolean;
  createComponentsFrame: boolean;
  createDesignSystem: boolean;
  applyAutoLayout: boolean;
  createStyles: boolean;
}

export class FigmaImporter {
  private nodeBuilder: NodeBuilder;
  private styleManager: StyleManager;
  private componentManager: ComponentManager;
  private variantsBuilder: VariantsFrameBuilder;
  private designSystemBuilder: DesignSystemBuilder;
  
  private stats = {
    elements: 0,
    components: 0,
    frames: 0,
    styles: 0
  };

  constructor(private data: any, private options: ImportOptions) {
    this.styleManager = new StyleManager(data.styles);
    this.componentManager = new ComponentManager(data.components);
    this.nodeBuilder = new NodeBuilder(this.styleManager, this.componentManager, options, data.assets);
    this.variantsBuilder = new VariantsFrameBuilder(this.nodeBuilder);
    this.designSystemBuilder = new DesignSystemBuilder(data.styles);
  }

  async run(): Promise<void> {
    figma.ui.postMessage({ type: 'progress', message: 'Initializing...', percent: 0 });

    await this.loadFonts();

    if (this.options.createStyles) {
      figma.ui.postMessage({ type: 'progress', message: 'Creating styles...', percent: 10 });
      await this.styleManager.createFigmaStyles();
      this.stats.styles = this.styleManager.getStyleCount();
    }

    const page = figma.currentPage;
    page.name = `${this.data.metadata.title} - ${this.data.metadata.viewport.width}px`;

    let xOffset = 0;
    const spacing = 100;

    if (this.options.createMainFrame) {
      figma.ui.postMessage({ type: 'progress', message: 'Creating main frame...', percent: 30 });
      const mainFrame = await this.createMainFrame();
      mainFrame.x = xOffset;
      mainFrame.y = 0;
      page.appendChild(mainFrame);
      xOffset += mainFrame.width + spacing;
      this.stats.frames++;
    }

    if (this.options.createVariantsFrame && this.data.variants) {
      figma.ui.postMessage({ type: 'progress', message: 'Creating variants frame...', percent: 50 });
      const variantsFrame = await this.variantsBuilder.createVariantsFrame(this.data.variants);
      if (variantsFrame) {
        variantsFrame.x = xOffset;
        variantsFrame.y = 0;
        page.appendChild(variantsFrame);
        xOffset += variantsFrame.width + spacing;
        this.stats.frames++;
      }
    }

    if (this.options.createComponentsFrame && this.data.components) {
      figma.ui.postMessage({ type: 'progress', message: 'Creating components library...', percent: 70 });
      const componentsFrame = await this.createComponentsLibrary();
      if (componentsFrame) {
        componentsFrame.x = xOffset;
        componentsFrame.y = 0;
        page.appendChild(componentsFrame);
        this.stats.frames++;
        this.stats.components = Object.keys(this.data.components.components || {}).length;
      }
    }

    if (this.options.createDesignSystem) {
      figma.ui.postMessage({ type: 'progress', message: 'Creating design system...', percent: 90 });
      const dsPage = await this.designSystemBuilder.createDesignSystemPage();
      this.stats.frames += 3;
    }

    figma.ui.postMessage({ type: 'progress', message: 'Finalizing...', percent: 100 });

    figma.viewport.scrollAndZoomIntoView(page.children);
  }

  private async loadFonts(): Promise<void> {
    const fonts = this.data.metadata.fonts || [];
    const fontsToLoad = new Set<{ family: string; style: string }>();

    fontsToLoad.add({ family: 'Inter', style: 'Regular' });
    fontsToLoad.add({ family: 'Inter', style: 'Medium' });
    fontsToLoad.add({ family: 'Inter', style: 'Semi Bold' });
    fontsToLoad.add({ family: 'Inter', style: 'Bold' });

    for (const font of fonts) {
      try {
        await figma.loadFontAsync({ family: font.family, style: 'Regular' });
        await figma.loadFontAsync({ family: font.family, style: 'Bold' });
      } catch (e) {
        console.warn(`Failed to load font: ${font.family}`);
      }
    }

    for (const fontSpec of fontsToLoad) {
      try {
        await figma.loadFontAsync(fontSpec);
      } catch (e) {
        console.warn(`Failed to load ${fontSpec.family} ${fontSpec.style}`);
      }
    }
  }

  private async createMainFrame(): Promise<FrameNode> {
    const mainFrame = figma.createFrame();
    mainFrame.name = `${this.data.metadata.title} - Main`;
    mainFrame.resize(this.data.tree.layout.width, this.data.tree.layout.height);
    mainFrame.clipsContent = false;

    await this.buildNode(this.data.tree, mainFrame);

    return mainFrame;
  }

  private async buildNode(nodeData: any, parent: BaseNode & ChildrenMixin): Promise<void> {
    const node = await this.nodeBuilder.createNode(nodeData);
    if (!node) return;

    parent.appendChild(node);
    this.stats.elements++;

    if (this.shouldRecurse(node, nodeData)) {
      await this.buildChildren(nodeData, node as BaseNode & ChildrenMixin);
    }
  }

  private async buildChildren(nodeData: any, parent: BaseNode & ChildrenMixin): Promise<void> {
    const children = this.prepareChildren(nodeData);
    for (const entry of children) {
      const childNode = await this.nodeBuilder.createNode(entry.data);
      if (!childNode) continue;

      if (entry.meta.pseudo) {
        this.safeSetPluginData(childNode, 'pseudoElement', entry.meta.pseudo);
      }

      parent.appendChild(childNode);
      this.stats.elements++;

      if (this.shouldRecurse(childNode, entry.data)) {
        await this.buildChildren(entry.data, childNode as BaseNode & ChildrenMixin);
      }
    }
  }

  private shouldRecurse(node: SceneNode, data: any): boolean {
    const hasChildren = Array.isArray(data.children) && data.children.length > 0;
    const hasPseudo =
      data.pseudoElements && (data.pseudoElements.before || data.pseudoElements.after);
    return 'children' in node && (hasChildren || hasPseudo);
  }

  private prepareChildren(nodeData: any): Array<{ data: any; meta: { index: number; pseudo?: 'before' | 'after' } }> {
    const entries: Array<{ data: any; meta: { index: number; pseudo?: 'before' | 'after' } }> = [];
    const children = Array.isArray(nodeData.children) ? nodeData.children : [];

    children.forEach((child: any, index: number) => {
      entries.push({ data: child, meta: { index } });
    });

    if (nodeData.pseudoElements?.before) {
      entries.push({
        data: this.cloneNodeData(nodeData.pseudoElements.before),
        meta: { index: -1, pseudo: 'before' }
      });
    }

    if (nodeData.pseudoElements?.after) {
      entries.push({
        data: this.cloneNodeData(nodeData.pseudoElements.after),
        meta: { index: Number.MAX_SAFE_INTEGER, pseudo: 'after' }
      });
    }

    const compare = (
      a: { data: any; meta: { index: number; pseudo?: 'before' | 'after' } },
      b: { data: any; meta: { index: number; pseudo?: 'before' | 'after' } }
    ) => {
      const pseudoWeight = (value?: 'before' | 'after') =>
        value === 'before' ? -1 : value === 'after' ? 1 : 0;
      const pseudoDiff = pseudoWeight(a.meta.pseudo) - pseudoWeight(b.meta.pseudo);
      if (pseudoDiff !== 0) return pseudoDiff;

      const zA = a.data?.zIndex ?? 0;
      const zB = b.data?.zIndex ?? 0;
      if (zA !== zB) return zA - zB;

      const orderA = a.data?.order ?? 0;
      const orderB = b.data?.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;

      return a.meta.index - b.meta.index;
    };

    entries.sort(compare);
    return entries;
  }

  private cloneNodeData(node: any): any {
    if (!node) return null;
    const globalClone = (globalThis as any).structuredClone;
    if (typeof globalClone === 'function') {
      return globalClone(node);
    }
    return JSON.parse(JSON.stringify(node));
  }

  private safeSetPluginData(node: SceneNode, key: string, value: string) {
    try {
      node.setPluginData(key, value);
    } catch {
      // ignore
    }
  }

  private async createComponentsLibrary(): Promise<FrameNode | null> {
    const components = this.data.components?.components;
    if (!components || Object.keys(components).length === 0) return null;

    const frame = figma.createFrame();
    frame.name = '🧩 Components Library';
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.itemSpacing = 40;
    frame.paddingTop = frame.paddingBottom = 40;
    frame.paddingLeft = frame.paddingRight = 40;
    frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];

    for (const [id, componentDefRaw] of Object.entries(components)) {
      const componentDef = componentDefRaw as any;
      const componentNode = await this.nodeBuilder.createNode(componentDef.baseNode);
      if (componentNode) {
        const component = figma.createComponent();
        component.name = componentDef.name;
        component.resize(componentNode.width, componentNode.height);
        
        if ('children' in componentNode) {
          for (const child of [...componentNode.children]) {
            component.appendChild(child);
          }
        }
        
        componentNode.remove();
        frame.appendChild(component);
      }
    }

    return frame;
  }

  getStats() {
    return this.stats;
  }
}
