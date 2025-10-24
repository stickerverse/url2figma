figma.showUI(__html__, { width: 400, height: 600 });

interface ImportOptions {
  createMainFrame: boolean;
  createVariantsFrame: boolean;
  createComponentsFrame: boolean;
  createDesignSystem: boolean;
  applyAutoLayout: boolean;
  createStyles: boolean;
}

let stats = {
  elements: 0,
  components: 0,
  frames: 0,
  styles: 0
};

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'import') {
    try {
      stats = { elements: 0, components: 0, frames: 0, styles: 0 };
      
      figma.ui.postMessage({ type: 'progress', message: 'Loading fonts...', percent: 10 });
      await loadFonts(msg.data.metadata.fonts || []);

      figma.ui.postMessage({ type: 'progress', message: 'Creating main frame...', percent: 30 });
      
      const page = figma.currentPage;
      page.name = `${msg.data.metadata.title} - ${msg.data.metadata.viewport.width}px`;

      if (msg.options.createMainFrame) {
        const mainFrame = await createMainFrame(msg.data);
        page.appendChild(mainFrame);
        stats.frames++;
      }

      figma.ui.postMessage({ type: 'progress', message: 'Complete!', percent: 100 });
      figma.viewport.scrollAndZoomIntoView(page.children);
      
      figma.ui.postMessage({ type: 'complete', stats: stats });
      figma.notify('✓ Import complete!', { timeout: 3000 });
      
    } catch (error) {
      console.error('Import error:', error);
      figma.ui.postMessage({ 
        type: 'error',
        message: (error as any).message || 'Unknown error'
      });
      figma.notify('✗ Import failed. Check console.', { error: true });
    }
  }
};

async function loadFonts(fonts: any[]) {
  const fontsToLoad = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Inter', style: 'Medium' },
    { family: 'Inter', style: 'Bold' }
  ];

  for (const font of fontsToLoad) {
    try {
      await figma.loadFontAsync(font as FontName);
    } catch (e) {
      console.warn(`Failed to load ${font.family} ${font.style}`);
    }
  }
}

async function createMainFrame(data: any) {
  const mainFrame = figma.createFrame();
  mainFrame.name = `${data.metadata.title} - Main`;
  mainFrame.resize(data.tree.layout.width, data.tree.layout.height);
  mainFrame.clipsContent = false;
  mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

  await buildNode(data.tree, mainFrame, data.assets);

  return mainFrame;
}

async function buildNode(nodeData: any, parent: any, assets: any) {
  let node: any;

  try {
    switch (nodeData.type) {
      case 'TEXT':
        node = await createTextNode(nodeData);
        break;
      case 'IMAGE':
        node = await createImageNode(nodeData, assets);
        break;
      case 'RECTANGLE':
        node = createRectangleNode(nodeData);
        break;
      default:
        node = createFrameNode(nodeData);
    }

    if (node) {
      parent.appendChild(node);
      stats.elements++;

      if ('children' in node && nodeData.children) {
        for (const childData of nodeData.children) {
          await buildNode(childData, node, assets);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to create node:', nodeData.name, error);
  }
}

function createFrameNode(data: any) {
  const frame = figma.createFrame();
  frame.name = data.name || 'Frame';
  frame.resize(data.layout.width, data.layout.height);
  frame.x = data.layout.x || 0;
  frame.y = data.layout.y || 0;

  applyCommonStyles(frame, data);
  
  return frame;
}

async function createTextNode(data: any) {
  const text = figma.createText();
  text.name = data.name || 'Text';
  text.x = data.layout.x || 0;
  text.y = data.layout.y || 0;

  try {
    if (data.textStyle && data.textStyle.fontFamily) {
      const weight = mapFontWeight(data.textStyle.fontWeight || 400);
      await figma.loadFontAsync({ 
        family: data.textStyle.fontFamily, 
        style: weight 
      } as FontName);
      text.fontName = { family: data.textStyle.fontFamily, style: weight } as FontName;
      text.fontSize = data.textStyle.fontSize || 16;
    } else {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' } as FontName);
      text.fontName = { family: 'Inter', style: 'Regular' } as FontName;
    }
  } catch (e) {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' } as FontName);
    text.fontName = { family: 'Inter', style: 'Regular' } as FontName;
  }

  text.characters = data.characters || '';

  if (data.textStyle && data.textStyle.fills) {
    text.fills = convertFills(data.textStyle.fills) as Paint[];
  }

  if (data.opacity !== undefined) {
    text.opacity = data.opacity;
  }

  return text;
}

function createRectangleNode(data: any) {
  const rect = figma.createRectangle();
  rect.name = data.name || 'Rectangle';
  rect.resize(data.layout.width, data.layout.height);
  rect.x = data.layout.x || 0;
  rect.y = data.layout.y || 0;

  applyCommonStyles(rect, data);

  return rect;
}

async function createImageNode(data: any, assets: any) {
  const rect = figma.createRectangle();
  rect.name = data.name || 'Image';
  rect.resize(data.layout.width, data.layout.height);
  rect.x = data.layout.x || 0;
  rect.y = data.layout.y || 0;

  rect.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];

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

function applyCommonStyles(node: any, data: any) {
  if (data.fills && node.fills !== undefined) {
    node.fills = convertFills(data.fills) as Paint[];
  }

  if (data.cornerRadius && node.cornerRadius !== undefined) {
    const avg = (
      data.cornerRadius.topLeft +
      data.cornerRadius.topRight +
      data.cornerRadius.bottomRight +
      data.cornerRadius.bottomLeft
    ) / 4;
    node.cornerRadius = avg;
  }

  if (data.opacity !== undefined && node.opacity !== undefined) {
    node.opacity = data.opacity;
  }

  if (data.effects && node.effects !== undefined) {
    node.effects = convertEffects(data.effects) as Effect[];
  }

  if (data.strokes && node.strokes !== undefined) {
    node.strokes = convertStrokes(data.strokes) as Paint[];
  }
}

function convertFills(fills: any[]) {
  return fills.map(fill => {
    if (fill.type === 'SOLID') {
      return {
        type: 'SOLID' as const,
        color: fill.color || { r: 0, g: 0, b: 0 },
        opacity: fill.opacity !== undefined ? fill.opacity : 1
      };
    }
    return { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 } };
  });
}

function convertEffects(effects: any[]) {
  return effects.map(effect => {
    if (effect.type === 'DROP_SHADOW') {
      return {
        type: 'DROP_SHADOW' as const,
        color: effect.color || { r: 0, g: 0, b: 0, a: 0.25 },
        offset: effect.offset || { x: 0, y: 4 },
        radius: effect.radius || 4,
        spread: effect.spread || 0,
        visible: effect.visible !== false,
        blendMode: (effect.blendMode || 'NORMAL') as BlendMode
      };
    }
    return effect;
  });
}

function convertStrokes(strokes: any[]) {
  return strokes.map(stroke => ({
    type: 'SOLID' as const,
    color: stroke.color || { r: 0, g: 0, b: 0 },
    opacity: stroke.opacity !== undefined ? stroke.opacity : 1
  }));
}

function mapFontWeight(weight: number) {
  const weightMap: any = {
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
