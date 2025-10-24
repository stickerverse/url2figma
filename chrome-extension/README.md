Web to Figma Chrome Extension

Convert any web page to pixel-perfect, editable Figma components.

Installation

1. Install dependencies:
npm install

2. Build the extension:
npm run build

3. Load in Chrome:
   - Open chrome://extensions/
   - Enable Developer mode
   - Click Load unpacked
   - Select this directory

Usage

1. Navigate to any web page
2. Click the extension icon
3. Configure capture options
4. Click Capture Page
5. Wait for processing
6. Download JSON or send to Figma plugin

Features

- Pixel-perfect DOM extraction
- Computed style capture
- Pseudo-element support
- SVG vector extraction
- Image asset handling
- Auto Layout generation
- Component detection
- Interactive state capture
- Multi-viewport support
- Yoga layout integration
- Design system generation

Development

npm run dev

Type checking:
npm run type-check
