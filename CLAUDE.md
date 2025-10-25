# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HTML to Figma is a two-part system that converts web pages into pixel-perfect, editable Figma designs:

1. **Chrome Extension** ([chrome-extension/](chrome-extension/)): Captures DOM structure, computed styles, assets, and interactive states from live web pages
2. **Figma Plugin** ([chrome-extension/figma-plugin/](chrome-extension/figma-plugin/)): Imports the captured JSON data and reconstructs it as native Figma nodes with Auto Layout, styles, and components

## Build Commands

### Chrome Extension
```bash
cd chrome-extension
npm install
npm run build       # Production build
npm run dev         # Development build with watch mode
npm run type-check  # TypeScript type checking
```

After building, load the unpacked extension from `chrome-extension/` directory in Chrome Developer Mode (chrome://extensions/).

### Figma Plugin
```bash
cd chrome-extension/figma-plugin
npm install
npm run build       # Builds both plugin code and UI
npm run watch       # Watch mode for development
```

Load the plugin in Figma Desktop via Plugins → Development → Import plugin from manifest (select [manifest.json](chrome-extension/figma-plugin/manifest.json)).

## Architecture

### Chrome Extension Architecture

The extension operates in three isolated JavaScript contexts that communicate via message passing:

1. **Content Script** ([content-script.ts](chrome-extension/src/content-script.ts)):
   - Injects the extraction script into the page
   - Acts as message relay between injected script and background
   - Sends progress updates to the popup UI

2. **Injected Script** ([injected-script.ts](chrome-extension/src/injected-script.ts)):
   - Runs in the page's JavaScript context (full DOM access)
   - Orchestrates the extraction pipeline using specialized utilities
   - Produces the final `WebToFigmaSchema` JSON

3. **Background Service Worker** ([background.ts](chrome-extension/src/background.ts)):
   - Manages extension state and storage
   - Coordinates between popup and content scripts

4. **Popup UI** ([popup/](chrome-extension/src/popup/)):
   - User interface for configuring capture options
   - Displays capture progress and results
   - Provides JSON download and Figma plugin integration

### Extraction Pipeline

The injected script coordinates multiple specialized utilities in sequence:

1. **DOMExtractor** ([dom-extractor.ts](chrome-extension/src/utils/dom-extractor.ts)):
   - Recursively traverses the DOM tree
   - Extracts computed styles via `StyleParser`
   - Handles assets (images/SVGs) via `AssetHandler`
   - Determines Figma node types (FRAME, TEXT, RECTANGLE, IMAGE, VECTOR)
   - Generates semantic node names from HTML structure

2. **ComponentDetector** ([component-detector.ts](chrome-extension/src/utils/component-detector.ts)):
   - Detects repeated UI patterns (buttons, cards, inputs)
   - Groups similar elements into component definitions
   - Identifies component instances for Figma component system

3. **StateCapturer** ([state-capturer.ts](chrome-extension/src/utils/state-capturer.ts)):
   - Captures interactive states (hover, focus, active, disabled)
   - Programmatically triggers pseudo-states and re-extracts styles
   - Stores state variations for variant generation

4. **VariantsCollector** ([variants-collector.ts](chrome-extension/src/utils/variants-collector.ts)):
   - Aggregates captured states into variant sets
   - Prepares data for Figma's variant frames

### Data Schema

The central data contract between extension and plugin is `WebToFigmaSchema` ([types/schema.ts](chrome-extension/src/types/schema.ts)):

```typescript
{
  version: string;           // Schema version for compatibility
  metadata: PageMetadata;    // URL, title, viewport, fonts, capture options
  tree: ElementNode;         // Root node of the element tree
  assets: AssetRegistry;     // Images and SVGs with hashes
  styles: StyleRegistry;     // Reusable colors, text styles, effects
  components: ComponentRegistry; // Detected component definitions
  variants: VariantsRegistry;    // Interactive state variants
  yogaLayout?: YogaLayoutData;   // Optional Yoga flex layout data
}
```

**ElementNode** is the core building block:
- Contains Figma-compatible properties (layout, fills, strokes, effects, corner radius)
- Includes `autoLayout` data for Figma Auto Layout conversion
- Preserves HTML metadata (tag, classes, selectors) for reference
- Supports pseudo-elements (::before, ::after) as child nodes
- Recursive `children` array for tree structure

### Figma Plugin Architecture

The plugin ([figma-plugin/src/code.ts](chrome-extension/figma-plugin/src/code.ts)) reconstructs Figma nodes from the schema:

1. **Font Loading**: Pre-loads required fonts from metadata (defaults to Inter family)
2. **Node Building**: Recursively creates Figma nodes via `buildNode()`:
   - Maps schema node types to Figma API node types
   - Converts web color models to Figma RGBA
   - Applies fills, strokes, effects, corner radius
   - Processes text with proper font loading
3. **Frame Organization**: Creates structured pages:
   - Main frame with pixel-perfect layout
   - Variants frame with interactive states
   - Components library frame
   - Design system page with styles

**Key modules:**
- [node-builder.ts](chrome-extension/figma-plugin/src/node-builder.ts): Core Figma node creation logic
- [style-manager.ts](chrome-extension/figma-plugin/src/style-manager.ts): Creates reusable Figma color/text styles
- [component-manager.ts](chrome-extension/figma-plugin/src/component-manager.ts): Converts component definitions to Figma components
- [variants-frame-builder.ts](chrome-extension/figma-plugin/src/variants-frame-builder.ts): Builds interactive variant frames
- [design-system-builder.ts](chrome-extension/figma-plugin/src/design-system-builder.ts): Generates design system documentation page

## Key Technical Details

### Auto Layout Conversion

The extension analyzes CSS Flexbox/Grid properties and converts them to Figma Auto Layout:
- `display: flex` → `layoutMode: HORIZONTAL | VERTICAL`
- `justify-content` → `primaryAxisAlignItems`
- `align-items` → `counterAxisAlignItems`
- `gap` → `itemSpacing`
- CSS padding maps directly to Auto Layout padding

### Asset Handling

Images and SVGs are:
- Extracted with unique content-based hashes
- Stored as base64 in the JSON (for images)
- Stored as raw SVG code (for vectors)
- Referenced by hash in element nodes
- The Figma plugin creates image fills or vector nodes from these assets

### Style Deduplication

The `StyleRegistry` tracks:
- **Colors**: RGBA values with usage counts (for creating Figma color styles)
- **Text Styles**: Font family, weight, size, line height, letter spacing
- **Effects**: Drop shadows, inner shadows, blurs

Styles used frequently are converted to reusable Figma styles.

### Component Detection Algorithm

The ComponentDetector identifies components by:
1. Analyzing DOM structure similarity (same tag, classes, attributes)
2. Calculating visual similarity scores
3. Grouping elements with high similarity as component instances
4. Creating a base component definition from the first instance

### Build Output Structure

Chrome Extension builds to `chrome-extension/dist/`:
- `background.js` - Service worker
- `content-script.js` - Content script
- `injected-script.js` - Page context script
- `popup/` - Popup UI files

Figma Plugin compiles to `chrome-extension/figma-plugin/dist/`:
- `code.js` - Main plugin code
- `ui.js` - Plugin UI

## Development Workflow

1. Make changes to Chrome extension or Figma plugin source
2. Run build/watch command in the appropriate directory
3. For extension: Reload extension in chrome://extensions/
4. For plugin: Restart plugin in Figma Desktop
5. Test capture → import workflow end-to-end

## Testing a Capture

1. Navigate to any web page with the extension installed
2. Click extension icon to open popup
3. Configure capture options (hover states, component detection, etc.)
4. Click "Capture Page"
5. Wait for extraction to complete
6. Either download JSON or send directly to Figma plugin
7. In Figma plugin UI, load the JSON and click "Import to Figma"
8. Verify the imported design matches the original page

## Important Constraints

- **Font Loading**: Figma requires fonts to be loaded before creating text nodes. The plugin attempts to load fonts from metadata but falls back to Inter if unavailable.
- **Circular References**: The DOMExtractor tracks processed elements to prevent infinite loops in circular DOM structures.
- **Message Size Limits**: Very large pages may exceed Chrome message size limits. Consider implementing chunked message passing for production use.
- **Computed Styles**: All styles are extracted as computed values (px, rgba) rather than CSS variables or relative units.
- **Sandboxing**: The injected script has full page access but cannot use Chrome APIs directly - must communicate via content script.
