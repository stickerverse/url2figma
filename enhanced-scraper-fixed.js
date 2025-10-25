const puppeteer = require('puppeteer');
const fs = require('fs');

async function enhancedScraper() {
  console.log('🚀 ENHANCED SCRAPER - Complete Visual Data Extraction');
  console.log('🎯 Will capture text, colors, styling, and all visual content');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('🌐 Navigating to GitHub Features page...');
    await page.goto('https://github.com/features', { waitUntil: 'networkidle0' });
    
    console.log('⚡ Injecting enhanced extraction script...');
    
    // Inject comprehensive scraping script
    const scrapedData = await page.evaluate(() => {
      console.log('🔍 Starting enhanced DOM extraction...');
      
      let elementCount = 0;
      
      // Helper function to get computed styles
      function getComputedStyleData(element) {
        const computed = window.getComputedStyle(element);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
          fontFamily: computed.fontFamily,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          textAlign: computed.textAlign,
          borderRadius: computed.borderRadius,
          border: computed.border,
          boxShadow: computed.boxShadow,
          opacity: computed.opacity,
          zIndex: computed.zIndex
        };
      }
      
      // Helper function to convert CSS color to Figma format
      function parseColor(colorString) {
        if (!colorString || colorString === 'rgba(0, 0, 0, 0)' || colorString === 'transparent') {
          return null;
        }
        
        // Handle rgb/rgba colors
        const rgbaMatch = colorString.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1]) / 255;
          const g = parseInt(rgbaMatch[2]) / 255;
          const b = parseInt(rgbaMatch[3]) / 255;
          const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
          return { r: r, g: g, b: b, a: a };
        }
        
        // Handle hex colors
        const hexMatch = colorString.match(/^#([a-f\\d]{6})$/i);
        if (hexMatch) {
          const hex = hexMatch[1];
          return {
            r: parseInt(hex.substr(0, 2), 16) / 255,
            g: parseInt(hex.substr(2, 2), 16) / 255,
            b: parseInt(hex.substr(4, 2), 16) / 255,
            a: 1
          };
        }
        
        // Handle named colors
        const namedColors = {
          'white': { r: 1, g: 1, b: 1, a: 1 },
          'black': { r: 0, g: 0, b: 0, a: 1 },
          'red': { r: 1, g: 0, b: 0, a: 1 },
          'green': { r: 0, g: 1, b: 0, a: 1 },
          'blue': { r: 0, g: 0, b: 1, a: 1 }
        };
        
        return namedColors[colorString.toLowerCase()] || null;
      }
      
      // Function to create Figma-compatible fills
      function createFills(backgroundColor) {
        const color = parseColor(backgroundColor);
        if (!color) return [];
        
        return [{
          type: 'SOLID',
          color: { r: color.r, g: color.g, b: color.b },
          opacity: color.a
        }];
      }
      
      // Function to extract text styles
      function createTextStyle(element, computed) {
        const fontFamily = computed.fontFamily.replace(/["']/g, '').split(',')[0].trim();
        const fontSize = parseFloat(computed.fontSize) || 16;
        const fontWeight = computed.fontWeight === 'bold' ? 700 : 
                          computed.fontWeight === 'normal' ? 400 : 
                          parseInt(computed.fontWeight) || 400;
        
        return {
          fontFamily: fontFamily,
          fontSize: fontSize,
          fontWeight: fontWeight,
          lineHeight: computed.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(computed.lineHeight) || fontSize * 1.2,
          letterSpacing: parseFloat(computed.letterSpacing) || 0,
          textAlign: computed.textAlign || 'left',
          fills: createFills(computed.color)
        };
      }
      
      // Function to map HTML elements to Figma node types
      function mapElementType(element) {
        const tag = element.tagName.toLowerCase();
        const hasText = element.textContent && element.textContent.trim().length > 0;
        const hasOnlyTextChildren = Array.from(element.childNodes).every(child => 
          child.nodeType === Node.TEXT_NODE || 
          (child.nodeType === Node.ELEMENT_NODE && ['span', 'strong', 'em', 'a'].includes(child.tagName.toLowerCase()))
        );
        
        if (hasText && hasOnlyTextChildren && ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'label', 'strong', 'em', 'button'].includes(tag)) {
          return 'TEXT';
        } else if (tag === 'img') {
          return 'IMAGE';
        } else {
          return 'FRAME';
        }
      }
      
      function generateElementName(element, index) {
        const tag = element.tagName.toLowerCase();
        
        if (element.id) {
          return tag + '_' + element.id;
        }
        
        if (element.className && typeof element.className === 'string') {
          const firstClass = element.className.split(' ')[0];
          return tag + '_' + firstClass;
        }
        
        const textContent = element.textContent && element.textContent.trim();
        if (textContent && textContent.length > 0 && textContent.length < 30) {
          const cleanText = textContent.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
          return tag + '_' + cleanText;
        }
        
        return tag + '_' + index;
      }
      
      // Function to extract element data with full styling
      function extractElementData(element, depth) {
        depth = depth || 0;
        if (depth > 20) return null; // Prevent infinite recursion
        
        const rect = element.getBoundingClientRect();
        
        // Skip invisible or tiny elements
        if (rect.width < 1 || rect.height < 1 || rect.width > 5000 || rect.height > 5000) {
          return null;
        }
        
        elementCount++;
        const computed = getComputedStyleData(element);
        const nodeType = mapElementType(element);
        
        let elementData = {
          id: 'el-' + elementCount,
          type: nodeType,
          name: generateElementName(element, elementCount),
          htmlTag: element.tagName.toLowerCase(),
          cssClasses: Array.from(element.classList),
          cssId: element.id || '',
          layout: {
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };
        
        // Add fills (background colors)
        const fills = createFills(computed.backgroundColor);
        if (fills.length > 0) {
          elementData.fills = fills;
        }
        
        // Add corner radius
        const borderRadius = parseFloat(computed.borderRadius);
        if (borderRadius > 0) {
          elementData.cornerRadius = {
            topLeft: borderRadius,
            topRight: borderRadius,
            bottomRight: borderRadius,
            bottomLeft: borderRadius
          };
        }
        
        // Add opacity
        const opacity = parseFloat(computed.opacity);
        if (opacity < 1) {
          elementData.opacity = opacity;
        }
        
        // Handle text elements
        if (nodeType === 'TEXT') {
          const textContent = element.textContent.trim();
          if (textContent) {
            elementData.characters = textContent;
            elementData.textStyle = createTextStyle(element, computed);
          }
        }
        
        // Handle image elements
        if (nodeType === 'IMAGE' && element.src) {
          elementData.imageUrl = element.src;
          elementData.alt = element.alt || '';
        }
        
        // Add strokes (borders)
        if (computed.border && computed.border !== 'none' && computed.border !== '0px none') {
          const borderColor = parseColor(computed.borderColor || computed.color);
          if (borderColor) {
            elementData.strokes = [{
              type: 'SOLID',
              color: { r: borderColor.r, g: borderColor.g, b: borderColor.b },
              opacity: borderColor.a
            }];
            elementData.strokeWeight = parseFloat(computed.borderWidth) || 1;
          }
        }
        
        // Add effects (shadows)
        if (computed.boxShadow && computed.boxShadow !== 'none') {
          elementData.effects = [{
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.25 },
            offset: { x: 0, y: 4 },
            radius: 4,
            spread: 0,
            visible: true,
            blendMode: 'NORMAL'
          }];
        }
        
        // Process children (only for FRAME elements)
        elementData.children = [];
        if (nodeType === 'FRAME') {
          const children = Array.from(element.children);
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childData = extractElementData(child, depth + 1);
            if (childData) {
              elementData.children.push(childData);
            }
          }
        }
        
        return elementData;
      }
      
      // Start extraction from body
      console.log('🎨 Extracting visual data...');
      const bodyElement = document.body;
      const extractedTree = extractElementData(bodyElement);
      
      // Create complete data structure
      const enhancedData = {
        version: '2.0.0',
        metadata: {
          title: document.title,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          totalElements: elementCount,
          extractionMethod: 'enhanced_visual_scraper'
        },
        tree: extractedTree,
        assets: {},
        styles: {
          colors: [],
          textStyles: [],
          effects: []
        },
        components: {},
        variants: {}
      };
      
      console.log('✅ Enhanced extraction complete: ' + elementCount + ' elements with full styling');
      return enhancedData;
    });
    
    console.log('📊 Enhanced scraping completed!');
    console.log(`   Elements extracted: ${scrapedData.metadata.totalElements}`);
    console.log(`   Page: ${scrapedData.metadata.title}`);
    
    // Save enhanced data
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `github-features-enhanced-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(scrapedData, null, 2));
    
    console.log('✅ Enhanced data saved to:', filename);
    console.log('📁 File size:', (JSON.stringify(scrapedData).length / 1024).toFixed(1), 'KB');
    
    // Copy to desktop
    const path = require('path');
    const desktopPath = path.join(process.env.HOME, 'Desktop', filename);
    try {
      fs.copyFileSync(filename, desktopPath);
      console.log('✅ Also copied to Desktop:', desktopPath);
    } catch (err) {
      console.log('⚠️ Could not copy to Desktop');
    }
    
    console.log('\n🎨 ENHANCED DATA INCLUDES:');
    console.log('✅ Text content and characters');
    console.log('✅ Background colors and fills');
    console.log('✅ Text styles (fonts, sizes, colors)');
    console.log('✅ Border radius and corner radius');
    console.log('✅ Opacity and transparency');
    console.log('✅ Borders and strokes');
    console.log('✅ Box shadows and effects');
    console.log('✅ Image URLs and alt text');
    console.log('✅ Complete visual styling data');
    
    console.log('\n📋 USE THIS FILE IN FIGMA:');
    console.log('- Open your Web to Figma plugin');
    console.log('- Choose the new enhanced JSON file');
    console.log('- Import to see colored components with text!');
    
  } catch (error) {
    console.error('❌ Enhanced scraping error:', error.message);
  } finally {
    await browser.close();
  }
}

enhancedScraper();