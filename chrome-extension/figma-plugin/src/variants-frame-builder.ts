import { NodeBuilder } from './node-builder';

export class VariantsFrameBuilder {
  constructor(private nodeBuilder: NodeBuilder) {}

  async createVariantsFrame(variants: any): Promise<FrameNode | null> {
    const elements = variants.elements;
    if (!elements || Object.keys(elements).length === 0) return null;

    const container = figma.createFrame();
    container.name = '🎭 Interactive Variants';
    container.layoutMode = 'VERTICAL';
    container.primaryAxisSizingMode = 'AUTO';
    container.counterAxisSizingMode = 'AUTO';
    container.itemSpacing = 40;
    container.paddingTop = container.paddingBottom = 40;
    container.paddingLeft = container.paddingRight = 40;
    container.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];

    for (const [elementId, elementVariants] of Object.entries(elements) as any[]) {
      const variantGroup = await this.createVariantGroup(elementVariants);
      if (variantGroup) {
        container.appendChild(variantGroup);
      }
    }

    return container;
  }

  private async createVariantGroup(variants: any): Promise<FrameNode | null> {
    const states = variants.states;
    if (!states || Object.keys(states).length === 0) return null;

    const group = figma.createFrame();
    group.name = variants.baseElement?.name || 'Variant Group';
    group.layoutMode = 'HORIZONTAL';
    group.primaryAxisSizingMode = 'AUTO';
    group.counterAxisSizingMode = 'AUTO';
    group.itemSpacing = 20;
    group.paddingTop = group.paddingBottom = 20;
    group.paddingLeft = group.paddingRight = 20;
    group.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    group.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    group.strokeWeight = 1;
    group.cornerRadius = 8;

    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
    const titleText = figma.createText();
    titleText.fontName = { family: 'Inter', style: 'Medium' };
    titleText.fontSize = 12;
    titleText.characters = variants.selector || 'Element';
    titleText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    group.appendChild(titleText);

    for (const [stateName, stateNode] of Object.entries(states)) {
      const wrapper = await this.createStateWrapper(stateName as string, stateNode as any);
      if (wrapper) {
        group.appendChild(wrapper);
      }
    }

    return group;
  }

  private async createStateWrapper(stateName: string, stateNode: any): Promise<FrameNode | null> {
    const wrapper = figma.createFrame();
    wrapper.layoutMode = 'VERTICAL';
    wrapper.primaryAxisSizingMode = 'AUTO';
    wrapper.counterAxisSizingMode = 'AUTO';
    wrapper.itemSpacing = 8;
    wrapper.fills = [];

    const node = await this.nodeBuilder.createNode(stateNode);
    if (node) {
      wrapper.appendChild(node);
    }

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const label = figma.createText();
    label.fontName = { family: 'Inter', style: 'Regular' };
    label.fontSize = 10;
    label.characters = stateName;
    label.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    wrapper.appendChild(label);

    return wrapper;
  }
}
