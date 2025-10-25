const puppeteer = require('puppeteer');
const fs = require('fs');

async function workingVisualScraper() {
  console.log('🔧 WORKING VISUAL SCRAPER - Fixed Approach');
  console.log('🎯 Extracting text, colors, and styling that works with our Figma plugin');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('🌐 Navigating to GitHub Features page...');
    await page.goto('https://github.com/features', { waitUntil: 'networkidle0' });
    
    console.log('⚡ Extracting visible content with styling...');
    
    const scrapedData = await page.evaluate(() => {
      console.log('🔍 Starting visual extraction...');
      
      let elementCount = 0;
      const extractedElements = [];
      
      // Simple but effective color parser
      function parseColorToFigma(colorStr) {
        if (!colorStr || colorStr === 'rgba(0, 0, 0, 0)' || colorStr === 'transparent') {
          return null;
        }
        
        // Handle rgba colors
        const match = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (match) {
          const r = parseInt(match[1]) / 255;
          const g = parseInt(match[2]) / 255;
          const b = parseInt(match[3]) / 255;
          const a = match[4] ? parseFloat(match[4]) : 1;
          
          return {
            type: 'SOLID',
            color: { r: r, g: g, b: b },
            opacity: a
          };
        }
        
        return null;
      }
      
      // Walk through all visible elements
      function extractElements() {
        const allElements = document.querySelectorAll('*');
        
        for (const element of allElements) {
          // Skip non-visible elements
          if (element.offsetParent === null) continue;
          if (['SCRIPT', 'STYLE', 'META', 'LINK'].includes(element.tagName)) continue;
          
          const rect = element.getBoundingClientRect();
          
          // Only process reasonably sized elements
          if (rect.width > 5 && rect.height > 5 && rect.width < 2000 && rect.height < 2000) {
            elementCount++;
            
            const computed = window.getComputedStyle(element);
            const textContent = element.textContent && element.textContent.trim();
            
            // Determine element type
            let elementType = 'FRAME';
            let characters = null;
            let textStyle = null;
            
            // Check if this should be a text element
            const isTextTag = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'BUTTON', 'LABEL', 'STRONG', 'EM'].includes(element.tagName);
            const hasDirectText = textContent && textContent.length > 0 && textContent.length < 200;
            const hasNoComplexChildren = !element.querySelector('div, section, article, header, footer, nav, main, aside, ul, ol, table');
            
            if (isTextTag && hasDirectText && hasNoComplexChildren) {
              elementType = 'TEXT';
              characters = textContent;
              
              // Extract text styling
              const textColor = parseColorToFigma(computed.color);
              textStyle = {
                fontFamily: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || 'Inter',
                fontSize: parseFloat(computed.fontSize) || 16,
                fontWeight: computed.fontWeight === 'bold' ? 700 : 
                           computed.fontWeight === 'normal' ? 400 : 
                           parseInt(computed.fontWeight) || 400,
                fills: textColor ? [textColor] : []
              };
            }
            
            // Extract background styling
            const backgroundFill = parseColorToFigma(computed.backgroundColor);
            
            const elementData = {
              id: `el-${elementCount}`,
              type: elementType,
              name: generateElementName(element, elementCount),
              layout: {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                x: Math.round(rect.left + window.scrollX),
                y: Math.round(rect.top + window.scrollY)
              }
            };
            
            // Add background color if present
            if (backgroundFill && backgroundFill.opacity > 0) {
              elementData.fills = [backgroundFill];
            }
            
            // Add text content and styling
            if (elementType === 'TEXT' && characters) {
              elementData.characters = characters;
              if (textStyle) {
                elementData.textStyle = textStyle;
              }
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
            
            extractedElements.push(elementData);
            
            // Progress logging
            if (elementCount % 100 === 0) {
              console.log(`Extracted ${elementCount} elements...`);
            }
          }
        }
      }
      
      function generateElementName(element, index) {
        const tag = element.tagName.toLowerCase();
        
        // Use ID if available
        if (element.id) {
          return `${tag}_${element.id}`;
        }
        
        // Use first class if available
        if (element.className && typeof element.className === 'string') {
          const firstClass = element.className.split(' ')[0];
          return `${tag}_${firstClass}`;
        }
        
        // For text elements, use part of the text
        const text = element.textContent && element.textContent.trim();
        if (text && text.length > 0 && text.length < 50) {
          const cleanText = text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
          return `${tag}_${cleanText}`;
        }
        
        return `${tag}_${index}`;
      }
      
      // Extract all elements
      extractElements();
      
      // Create tree structure (flat list for now, plugin will handle hierarchy)
      const rootElement = {
        id: 'root',
        type: 'FRAME',
        name: 'GitHub_Features_Page',
        layout: {
          width: window.innerWidth,
          height: Math.max(document.body.scrollHeight, window.innerHeight),
          x: 0,
          y: 0
        },
        fills: [{
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1 },
          opacity: 1
        }],
        children: extractedElements // All elements as children for now
      };
      
      const finalData = {
        version: '1.0.0',
        metadata: {
          title: document.title,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          totalElements: elementCount
        },
        tree: rootElement,
        assets: {},
        styles: {},
        components: {},
        variants: {}
      };
      
      console.log(`✅ Extraction complete: ${elementCount} elements with styling`);
      return finalData;
    });
    
    console.log('📊 Visual scraping completed!');
    console.log(`   Elements extracted: ${scrapedData.metadata.totalElements}`);
    console.log(`   Page: ${scrapedData.metadata.title}`);
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `github-features-working-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(scrapedData, null, 2));
    
    console.log('✅ Working visual data saved to:', filename);
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
    
    console.log('\n🎨 WORKING DATA INCLUDES:');
    console.log('✅ Text content with proper characters field');
    console.log('✅ Background colors as Figma fills');
    console.log('✅ Text colors in textStyle.fills');
    console.log('✅ Font families, sizes, and weights');
    console.log('✅ Corner radius for rounded elements');
    console.log('✅ Opacity for transparent elements');
    console.log('✅ Proper element type detection (TEXT vs FRAME)');
    
    console.log('\n📋 READY FOR FIGMA IMPORT:');
    console.log(`File: ${filename}`);
    console.log('This should show actual text and colors in Figma!');
    
  } catch (error) {
    console.error('❌ Working scraper error:', error.message);
  } finally {
    await browser.close();
  }
}

workingVisualScraper();