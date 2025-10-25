const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function autoFigmaTransfer() {
  console.log('🚀 AUTO FIGMA TRANSFER - Send JSON Directly to Plugin');
  console.log('🎯 Automatically scrape page and send to open Figma plugin');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('🌐 Navigating to target page...');
    await page.goto('https://github.com/features', { waitUntil: 'networkidle0' });
    
    console.log('⚡ Extracting visual data...');
    
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
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
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
              id: 'el-' + elementCount,
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
              console.log('Extracted ' + elementCount + ' elements...');
            }
          }
        }
      }
      
      function generateElementName(element, index) {
        const tag = element.tagName.toLowerCase();
        
        // Use ID if available
        if (element.id) {
          return tag + '_' + element.id;
        }
        
        // Use first class if available
        if (element.className && typeof element.className === 'string') {
          const firstClass = element.className.split(' ')[0];
          return tag + '_' + firstClass;
        }
        
        // For text elements, use part of the text
        const text = element.textContent && element.textContent.trim();
        if (text && text.length > 0 && text.length < 50) {
          const cleanText = text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
          return tag + '_' + cleanText;
        }
        
        return tag + '_' + index;
      }
      
      // Extract all elements
      extractElements();
      
      // Create tree structure
      const rootElement = {
        id: 'root',
        type: 'FRAME',
        name: 'Auto_Transfer_Page',
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
        children: extractedElements
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
          totalElements: elementCount,
          transferMethod: 'auto_transfer'
        },
        tree: rootElement,
        assets: {},
        styles: {},
        components: {},
        variants: {}
      };
      
      console.log('✅ Extraction complete: ' + elementCount + ' elements with styling');
      return finalData;
    });
    
    console.log('📊 Data extraction completed!');
    console.log('   Elements extracted:', scrapedData.metadata.totalElements);
    console.log('   Page:', scrapedData.metadata.title);
    
    // Save the JSON file first
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = 'auto-transfer-' + timestamp + '.json';
    const filePath = path.join(__dirname, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(scrapedData, null, 2));
    console.log('✅ Data saved to:', filename);
    
    // Now automatically send to Figma plugin
    console.log('🚀 Attempting automatic transfer to Figma plugin...');
    
    // Create a new page for Figma plugin injection
    const figmaPage = await browser.newPage();
    
    // Navigate to a blank page where we can inject our transfer code
    await figmaPage.goto('data:text/html,<html><body><h1>Figma Auto Transfer</h1></body></html>');
    
    // Inject the data into the page context and create transfer code
    const transferResult = await figmaPage.evaluate((jsonData) => {
      // Store the data globally
      window.figmaTransferData = jsonData;
      
      // Create the injection code that can be copied to Figma plugin console
      const injectionCode = `
// PASTE THIS CODE INTO YOUR FIGMA PLUGIN CONSOLE
// This will automatically load the scraped data

const autoTransferData = ${JSON.stringify(jsonData, null, 2)};

console.log('🚀 Auto Transfer Data Loaded');
console.log('Elements:', autoTransferData.metadata.totalElements);

// If live mode functions exist, use them
if (typeof window.loadAutoTransferData === 'function') {
  window.loadAutoTransferData(autoTransferData);
  console.log('✅ Data sent to live mode');
} else if (typeof parent.postMessage === 'function') {
  // Try posting to parent (Figma)
  parent.postMessage({
    pluginMessage: {
      type: 'live-import',
      data: autoTransferData
    }
  }, '*');
  console.log('✅ Data sent via postMessage');
} else {
  // Store for manual import
  window.autoTransferData = autoTransferData;
  console.log('📋 Data stored as window.autoTransferData');
  console.log('💡 Click Import button or call: document.getElementById("import-btn").click()');
}
`;
      
      return {
        success: true,
        dataSize: JSON.stringify(jsonData).length,
        injectionCode: injectionCode
      };
    }, scrapedData);
    
    console.log('✅ Transfer preparation complete!');
    console.log('📁 Data size:', (transferResult.dataSize / 1024).toFixed(1), 'KB');
    
    // Save the injection code to a file for easy access
    const injectionFilename = 'figma-injection-' + timestamp + '.js';
    fs.writeFileSync(injectionFilename, transferResult.injectionCode);
    
    console.log('\n🎯 AUTOMATIC TRANSFER READY!');
    console.log('─────────────────────────────────');
    console.log('1. JSON file saved:', filename);
    console.log('2. Injection code saved:', injectionFilename);
    console.log('\n🔧 TO COMPLETE THE TRANSFER:');
    console.log('1. Open your Figma plugin');
    console.log('2. Open browser console (F12) in the plugin');
    console.log('3. Copy and paste the code from:', injectionFilename);
    console.log('4. Press Enter to execute');
    console.log('\n✨ The data will automatically load into your plugin!');
    
    // Also copy to desktop for convenience
    try {
      const desktopPath = path.join(process.env.HOME, 'Desktop', filename);
      const desktopInjectionPath = path.join(process.env.HOME, 'Desktop', injectionFilename);
      
      fs.copyFileSync(filePath, desktopPath);
      fs.copyFileSync(injectionFilename, desktopInjectionPath);
      
      console.log('\n📋 Files also copied to Desktop for easy access');
    } catch (err) {
      console.log('⚠️ Could not copy to Desktop');
    }
    
  } catch (error) {
    console.error('❌ Auto transfer error:', error.message);
  } finally {
    // Keep browser open for user to see the results
    console.log('\n🔄 Browser staying open for manual verification...');
    console.log('Close this window when transfer is complete.');
  }
}

autoFigmaTransfer();