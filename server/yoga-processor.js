const Yoga = require('yoga-layout-prebuilt');

/**
 * Build a Yoga node tree that mirrors the schema tree.
 */
function buildYogaNode(node) {
  const yogaNode = Yoga.Node.create();

  const width = node.layout?.width ?? 0;
  const height = node.layout?.height ?? 0;
  if (width) yogaNode.setWidth(width);
  if (height) yogaNode.setHeight(height);

  if (node.autoLayout && node.autoLayout.layoutMode && node.autoLayout.layoutMode !== 'NONE') {
    yogaNode.setDisplay(Yoga.DISPLAY_FLEX);
    yogaNode.setFlexDirection(
      node.autoLayout.layoutMode === 'VERTICAL'
        ? Yoga.FLEX_DIRECTION_COLUMN
        : Yoga.FLEX_DIRECTION_ROW
    );
    yogaNode.setJustifyContent(mapJustify(node.autoLayout.primaryAxisAlignItems));
    yogaNode.setAlignItems(mapAlign(node.autoLayout.counterAxisAlignItems));

    yogaNode.setPadding(Yoga.EDGE_TOP, node.autoLayout.paddingTop || 0);
    yogaNode.setPadding(Yoga.EDGE_RIGHT, node.autoLayout.paddingRight || 0);
    yogaNode.setPadding(Yoga.EDGE_BOTTOM, node.autoLayout.paddingBottom || 0);
    yogaNode.setPadding(Yoga.EDGE_LEFT, node.autoLayout.paddingLeft || 0);

    if (node.autoLayout.itemSpacing > 0 && yogaNode.setGap) {
      yogaNode.setGap(Yoga.GUTTER_ALL, node.autoLayout.itemSpacing);
    }
  } else {
    yogaNode.setDisplay(Yoga.DISPLAY_NONE);
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => {
      const childYoga = buildYogaNode(child);
      if (child.position === 'absolute' || child.position === 'fixed') {
        childYoga.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE);
        if (child.absoluteLayout) {
          if (Number.isFinite(child.absoluteLayout.left)) {
            childYoga.setPosition(Yoga.EDGE_LEFT, child.absoluteLayout.left);
          }
          if (Number.isFinite(child.absoluteLayout.top)) {
            childYoga.setPosition(Yoga.EDGE_TOP, child.absoluteLayout.top);
          }
        }
      }
      yogaNode.insertChild(childYoga, yogaNode.getChildCount());
    });
  }

  return yogaNode;
}

function mapJustify(value) {
  switch (value) {
    case 'CENTER':
      return Yoga.JUSTIFY_CENTER;
    case 'MAX':
      return Yoga.JUSTIFY_FLEX_END;
    case 'SPACE_BETWEEN':
      return Yoga.JUSTIFY_SPACE_BETWEEN;
    case 'MIN':
    default:
      return Yoga.JUSTIFY_FLEX_START;
  }
}

function mapAlign(value) {
  switch (value) {
    case 'CENTER':
      return Yoga.ALIGN_CENTER;
    case 'MAX':
      return Yoga.ALIGN_FLEX_END;
    case 'STRETCH':
      return Yoga.ALIGN_STRETCH;
    case 'MIN':
    default:
      return Yoga.ALIGN_FLEX_START;
  }
}

function applyYogaLayout(node, yogaNode, parentOffset = { x: 0, y: 0 }) {
  if (!node || !yogaNode) return;

  const left = yogaNode.getComputedLeft();
  const top = yogaNode.getComputedTop();
  const width = yogaNode.getComputedWidth();
  const height = yogaNode.getComputedHeight();

  if (Number.isFinite(left) && Number.isFinite(top)) {
    node.layout = node.layout || {};
    node.layout.x = left;
    node.layout.y = top;
  }
  if (Number.isFinite(width) && Number.isFinite(height)) {
    node.layout = node.layout || {};
    node.layout.width = width;
    node.layout.height = height;
  }

  if (node.absoluteLayout) {
    node.absoluteLayout.left = parentOffset.x + left;
    node.absoluteLayout.top = parentOffset.y + top;
    node.absoluteLayout.right = node.absoluteLayout.left + width;
    node.absoluteLayout.bottom = node.absoluteLayout.top + height;
    node.absoluteLayout.width = width;
    node.absoluteLayout.height = height;
  }

  const childOffset = {
    x: parentOffset.x + left,
    y: parentOffset.y + top
  };

  const childCount = yogaNode.getChildCount();
  if (Array.isArray(node.children)) {
    for (let i = 0; i < node.children.length && i < childCount; i++) {
      applyYogaLayout(node.children[i], yogaNode.getChild(i), childOffset);
    }
  }
}

function serializeYogaNode(yogaNode) {
  const result = {
    left: yogaNode.getComputedLeft(),
    top: yogaNode.getComputedTop(),
    width: yogaNode.getComputedWidth(),
    height: yogaNode.getComputedHeight(),
    children: []
  };

  for (let i = 0; i < yogaNode.getChildCount(); i++) {
    result.children.push(serializeYogaNode(yogaNode.getChild(i)));
  }

  return result;
}

function freeYogaNode(yogaNode) {
  for (let i = 0; i < yogaNode.getChildCount(); i++) {
    freeYogaNode(yogaNode.getChild(i));
  }
  yogaNode.free();
}

function processSchema(schema, options = {}) {
  if (!schema || !schema.tree) {
    throw new Error('Invalid schema payload');
  }

  const rootYogaNode = buildYogaNode(schema.tree);
  const width = options.width || schema.metadata?.viewport?.width || undefined;
  const height = options.height || schema.metadata?.viewport?.height || undefined;
  rootYogaNode.calculateLayout(width || Yoga.UNDEFINED, height || Yoga.UNDEFINED, Yoga.DIRECTION_LTR);

  applyYogaLayout(schema.tree, rootYogaNode);
  schema.yogaLayout = {
    calculatedByYoga: true,
    layoutTree: serializeYogaNode(rootYogaNode)
  };
  freeYogaNode(rootYogaNode);

  return schema;
}

if (require.main === module) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: node server/yoga-processor.js <input schema json> <output schema json>');
    process.exit(1);
  }
  const fs = require('fs');
  const schema = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const processed = processSchema(schema);
  fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2), 'utf8');
  console.log(`Yoga layout written to ${outputPath}`);
}

module.exports = {
  processSchema
};
