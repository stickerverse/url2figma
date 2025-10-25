const puppeteer = require('puppeteer');
const fs = require('fs');

async function figmaReadyScraper() {
  console.log('🎨 FIGMA-READY SCRAPER - Complete Visual Data Extraction');
  console.log('🎯 Following the comprehensive scraper guide for Figma components');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('🌐 Navigating to GitHub Features page...');
    await page.goto('https://github.com/features', { waitUntil: 'networkidle0' });
    
    console.log('⚡ Extracting Figma-ready component data...');
    
    const scrapedData = await page.evaluate(() => {
      console.log('🔍 Starting Figma-compatible extraction...');
      
      let componentCount = 0;
      const components = [];
      const assets = [];
      const styles = {
        colors: new Set(),
        textStyles: new Set(),
        effects: []
      };
      
      // Helper: Parse CSS color to Figma RGB format
      function parseColor(cssColor) {
        if (!cssColor || cssColor === 'rgba(0, 0, 0, 0)' || cssColor === 'transparent') {
          return null;
        }
        
        // Handle rgba colors
        const rgbaMatch = cssColor.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (rgbaMatch) {
          return {
            r: parseInt(rgbaMatch[1]) / 255,
            g: parseInt(rgbaMatch[2]) / 255,
            b: parseInt(rgbaMatch[3]) / 255,
            a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
          };
        }
        
        // Handle hex colors
        const hexMatch = cssColor.match(/^#([a-f\\d]{6})$/i);
        if (hexMatch) {
          const hex = hexMatch[1];
          return {
            r: parseInt(hex.substr(0, 2), 16) / 255,
            g: parseInt(hex.substr(2, 2), 16) / 255,
            b: parseInt(hex.substr(4, 2), 16) / 255,
            a: 1
          };
        }
        
        return null;
      }
      
      // Helper: Create Figma fills from CSS
      function createFills(backgroundColor) {
        const color = parseColor(backgroundColor);
        if (!color || color.a === 0) return [];
        
        styles.colors.add(backgroundColor);
        
        return [{
          type: 'SOLID',
          color: { r: color.r, g: color.g, b: color.b },
          opacity: color.a
        }];
      }
      
      // Helper: Parse text styles for Figma
      function createTextStyle(computed) {
        const fontFamily = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        const fontSize = parseFloat(computed.fontSize) || 16;
        const fontWeight = computed.fontWeight === 'bold' ? 700 : 
                          computed.fontWeight === 'normal' ? 400 : 
                          parseInt(computed.fontWeight) || 400;
        
        const textColor = parseColor(computed.color);
        
        const textStyle = {
          fontFamily: fontFamily,
          fontSize: fontSize,
          fontWeight: fontWeight,
          lineHeight: computed.lineHeight === 'normal' ? 
            { unit: 'AUTO' } : 
            { value: parseFloat(computed.lineHeight) || fontSize * 1.2, unit: 'PIXELS' },
          letterSpacing: { value: parseFloat(computed.letterSpacing) || 0, unit: 'PIXELS' },
          textAlignHorizontal: computed.textAlign === 'center' ? 'CENTER' : 
                              computed.textAlign === 'right' ? 'RIGHT' : 'LEFT',
          fills: textColor ? [{
            type: 'SOLID',
            color: { r: textColor.r, g: textColor.g, b: textColor.b },
            opacity: textColor.a
          }] : []
        };
        
        styles.textStyles.add(JSON.stringify(textStyle));
        return textStyle;
      }
      
      // Helper: Parse effects (shadows)
      function parseEffects(boxShadow) {
        if (!boxShadow || boxShadow === 'none') return [];
        
        // Simple shadow parsing: "0px 2px 8px rgba(0, 0, 0, 0.1)"
        const shadowMatch = boxShadow.match(/([-\\d.]+)px\\s+([-\\d.]+)px\\s+([-\\d.]+)px(?:\\s+([-\\d.]+)px)?\\s+rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (shadowMatch) {
          const [, offsetX, offsetY, radius, spread = '0', r, g, b, a = '1'] = shadowMatch;
          
          return [{
            type: 'DROP_SHADOW',
            color: {
              r: parseInt(r) / 255,
              g: parseInt(g) / 255,
              b: parseInt(b) / 255,
              a: parseFloat(a)
            },
            offset: {
              x: parseFloat(offsetX),
              y: parseFloat(offsetY)
            },
            radius: parseFloat(radius),
            spread: parseFloat(spread),
            visible: true,
            blendMode: 'NORMAL'
          }];
        }
        
        return [];
      }
      
      // Helper: Determine Figma node type
      function getFigmaType(element) {
        const tag = element.tagName.toLowerCase();
        const hasTextContent = element.textContent && element.textContent.trim().length > 0;
        
        // Check if element contains only text (no child elements with layout)
        const hasOnlyText = Array.from(element.childNodes).every(child => 
          child.nodeType === Node.TEXT_NODE || 
          (child.nodeType === Node.ELEMENT_NODE && 
           ['span', 'strong', 'em', 'a', 'code'].includes(child.tagName.toLowerCase()) &&
           !child.querySelector('div, section, article, header, footer, nav, main, aside'))
        );
        
        if (hasTextContent && hasOnlyText && 
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'label'].includes(tag)) {
          return 'TEXT';
        }
        
        if (tag === 'img') {
          return 'RECTANGLE'; // Images become rectangles with image fills
        }
        
        return 'FRAME';
      }
      
      // Helper: Generate component name
      function generateComponentName(element) {
        // Try to get semantic name
        const ariaLabel = element.getAttribute('aria-label');
        const id = element.id;
        const className = element.className;
        const tag = element.tagName.toLowerCase();
        
        if (ariaLabel) return ariaLabel;
        if (id) return id.replace(/[-_]/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
        if (className && typeof className === 'string') {
          const firstClass = className.split(' ')[0];
          return firstClass.replace(/[-_]/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
        }
        
        // For text elements, use truncated content
        if (element.textContent && element.textContent.trim()) {
          const text = element.textContent.trim().substring(0, 30);
          return text.length < 30 ? text : text + '...';
        }
        
        return tag.charAt(0).toUpperCase() + tag.slice(1);
      }
      
      // Main extraction function
      function extractComponent(element, depth = 0) {
        if (depth > 15) return null; // Prevent infinite recursion
        
        const rect = element.getBoundingClientRect();
        const computed = window.getComputedStyle(element);
        
        // Skip invisible or problematic elements
        if (rect.width < 1 || rect.height < 1 || 
            rect.width > 3000 || rect.height > 3000 ||
            computed.display === 'none' || 
            computed.visibility === 'hidden' ||
            computed.opacity === '0') {
          return null;
        }
        
        componentCount++;
        const figmaType = getFigmaType(element);
        const componentName = generateComponentName(element);
        
        const component = {
          id: `${figmaType.toLowerCase()}_${componentCount}`,
          type: figmaType,
          name: componentName,
          properties: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY)
          }
        };
        
        // Add fills (background colors)
        const fills = createFills(computed.backgroundColor);
        if (fills.length > 0) {
          component.properties.fills = fills;
        }
        
        // Add corner radius
        const borderRadius = parseFloat(computed.borderRadius);
        if (borderRadius > 0) {
          component.properties.cornerRadius = borderRadius;
        }
        
        // Add opacity
        const opacity = parseFloat(computed.opacity);
        if (opacity < 1) {
          component.properties.opacity = opacity;
        }
        
        // Add effects (shadows)
        const effects = parseEffects(computed.boxShadow);
        if (effects.length > 0) {
          component.properties.effects = effects;
        }
        
        // Add strokes (borders)
        if (computed.borderStyle !== 'none' && computed.borderWidth !== '0px') {
          const borderColor = parseColor(computed.borderColor);
          if (borderColor) {
            component.properties.strokes = [{
              type: 'SOLID',
              color: { r: borderColor.r, g: borderColor.g, b: borderColor.b },
              opacity: borderColor.a
            }];
            component.properties.strokeWeight = parseFloat(computed.borderWidth) || 1;
          }
        }
        
        // Handle TEXT elements
        if (figmaType === 'TEXT') {
          const textContent = element.textContent.trim();
          if (textContent) {
            component.properties.characters = textContent;
            const textStyle = createTextStyle(computed);
            Object.assign(component.properties, textStyle);
          }
        }
        
        // Handle IMAGE elements
        if (figmaType === 'RECTANGLE' && element.tagName.toLowerCase() === 'img') {
          const imgSrc = element.src;
          if (imgSrc) {
            // For now, create placeholder - in production would download and encode
            const assetId = `asset_${assets.length + 1}`;
            assets.push({
              id: assetId,
              type: 'image',
              url: imgSrc,
              base64: 'data:image/png;base64,placeholder', // Would be actual base64
              metadata: {
                width: element.naturalWidth || rect.width,
                height: element.naturalHeight || rect.height,
                format: 'png'
              }
            });
            
            component.properties.fills = [{
              type: 'IMAGE',
              imageRef: assetId,
              scaleMode: 'FILL'
            }];
          }
        }
        
        // Extract children for FRAME elements
        if (figmaType === 'FRAME') {
          component.children = [];
          const children = Array.from(element.children);
          
          for (const child of children) {
            const childComponent = extractComponent(child, depth + 1);
            if (childComponent) {
              // Adjust child position relative to parent
              childComponent.properties.x -= component.properties.x;
              childComponent.properties.y -= component.properties.y;
              component.children.push(childComponent);
            }
          }
        }
        
        return component;
      }
      
      // Start extraction from body
      console.log('🎨 Extracting components from DOM...');
      const bodyElement = document.body;
      const mainComponent = extractComponent(bodyElement);
      
      if (mainComponent) {
        components.push(mainComponent);
      }
      
      // Create final output structure
      const figmaData = {
        version: '2.0.0',
        scrapeDate: new Date().toISOString(),
        sourceUrl: window.location.href,
        metadata: {
          title: document.title,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          totalComponents: componentCount,
          extractionMethod: 'figma_ready_scraper'
        },
        components: components,
        assets: assets,
        styles: {
          colors: Array.from(styles.colors),
          textStyles: Array.from(styles.textStyles).map(s => JSON.parse(s)),
          effects: styles.effects
        }
      };
      
      console.log(`✅ Extraction complete: ${componentCount} components with full styling`);
      return figmaData;
    });
    
    console.log('📊 Figma-ready scraping completed!');
    console.log(`   Components extracted: ${scrapedData.metadata.totalComponents}`);
    console.log(`   Page: ${scrapedData.metadata.title}`);
    console.log(`   Colors found: ${scrapedData.styles.colors.length}`);
    console.log(`   Text styles: ${scrapedData.styles.textStyles.length}`);
    
    // Save the enhanced data
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `github-features-figma-ready-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(scrapedData, null, 2));
    
    console.log('✅ Figma-ready data saved to:', filename);
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
    
    console.log('\n🎨 FIGMA-READY DATA INCLUDES:');
    console.log('✅ Complete text content and characters');
    console.log('✅ Accurate background colors and fills');
    console.log('✅ Full text styling (fonts, sizes, colors, alignment)');
    console.log('✅ Border radius and corner styling');
    console.log('✅ Opacity and transparency effects');
    console.log('✅ Box shadows and drop effects');
    console.log('✅ Border colors and stroke weights');
    console.log('✅ Hierarchical component structure');
    console.log('✅ Relative positioning within containers');
    console.log('✅ Image references and placeholders');
    
    console.log('\n📋 IMPORT THIS INTO FIGMA:');
    console.log(`File: ${filename}`);
    console.log('Expected: Fully styled components with text, colors, and effects!');
    console.log('No more white rectangles - real visual content!');
    
  } catch (error) {
    console.error('❌ Figma-ready scraping error:', error.message);
  } finally {
    await browser.close();
  }
}

figmaReadyScraper();