const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function directFigmaSender() {
  console.log('📤 DIRECT FIGMA SENDER - Multiple Transfer Methods');
  console.log('🎯 Scrape and automatically send to Figma plugin using best available method');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });
  
  try {
    // First, use our working visual scraper to get the data
    console.log('🔍 Using working visual scraper to extract data...');
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('🌐 Navigating to GitHub Features page...');
    await page.goto('https://github.com/features', { waitUntil: 'networkidle0' });
    
    console.log('⚡ Extracting visual content with styling...');
    
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
        name: 'Direct_Send_Page',
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
          transferMethod: 'direct_send'
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
    
    console.log('📊 Visual scraping completed!');
    console.log('   Elements extracted:', scrapedData.metadata.totalElements);
    console.log('   Page:', scrapedData.metadata.title);
    
    // Save the JSON file
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = 'direct-send-' + timestamp + '.json';
    const filePath = path.join(__dirname, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(scrapedData, null, 2));
    console.log('✅ Data saved to:', filename);
    
    // Copy to desktop
    const desktopPath = path.join(process.env.HOME, 'Desktop', filename);
    try {
      fs.copyFileSync(filePath, desktopPath);
      console.log('✅ Also copied to Desktop:', desktopPath);
    } catch (err) {
      console.log('⚠️ Could not copy to Desktop');
    }
    
    // Now create multiple transfer methods
    console.log('\n🚀 Creating multiple transfer methods...');
    
    // Method 1: Direct Console Injection
    const consoleInjection = `
// METHOD 1: DIRECT CONSOLE INJECTION
// Copy and paste this entire block into your Figma plugin console

console.log('🚀 Direct Figma Transfer - Loading Data...');

const directTransferData = ${JSON.stringify(scrapedData, null, 2)};

console.log('📊 Data Loaded:');
console.log('- Elements:', directTransferData.metadata.totalElements);
console.log('- Page:', directTransferData.metadata.title);

// Method A: If live import handler exists
if (typeof window.handleLiveImport === 'function') {
  window.handleLiveImport(directTransferData);
  console.log('✅ Data sent via handleLiveImport');
}
// Method B: If postMessage API available
else if (typeof parent.postMessage === 'function') {
  parent.postMessage({
    pluginMessage: {
      type: 'live-import',
      data: directTransferData
    }
  }, '*');
  console.log('✅ Data sent via postMessage');
}
// Method C: Direct storage and trigger
else {
  // Store data globally
  window.transferredData = directTransferData;
  
  // Try to find and trigger import button
  const importBtn = document.getElementById('import-btn') || 
                   document.querySelector('[data-action="import"]') ||
                   document.querySelector('button[class*="import"]') ||
                   document.querySelector('input[type="file"]');
  
  if (importBtn) {
    // Simulate file input if it's a file input
    if (importBtn.type === 'file') {
      const dataTransfer = new DataTransfer();
      const file = new File([JSON.stringify(directTransferData, null, 2)], '${filename}', {
        type: 'application/json'
      });
      dataTransfer.items.add(file);
      importBtn.files = dataTransfer.files;
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      importBtn.dispatchEvent(event);
      console.log('✅ File input triggered with data');
    } else {
      importBtn.click();
      console.log('✅ Import button clicked');
    }
  } else {
    console.log('📋 Data stored as window.transferredData');
    console.log('💡 Manually trigger import or access the data from window.transferredData');
  }
}

console.log('🎯 Transfer attempt complete!');
`;
    
    // Method 2: File Upload Simulation
    const fileUploadMethod = `
// METHOD 2: FILE UPLOAD SIMULATION
// This simulates dragging and dropping the JSON file

const fileData = ${JSON.stringify(scrapedData, null, 2)};
const fileName = '${filename}';

// Create blob and file
const blob = new Blob([JSON.stringify(fileData, null, 2)], { type: 'application/json' });
const file = new File([blob], fileName, { type: 'application/json' });

// Find file input or drop zone
const fileInput = document.querySelector('input[type="file"]') || 
                 document.querySelector('[data-testid="file-input"]') ||
                 document.querySelector('.file-input');

const dropZone = document.querySelector('[data-testid="drop-zone"]') || 
                document.querySelector('.drop-zone') ||
                document.querySelector('[class*="drop"]');

if (fileInput) {
  // Simulate file selection
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  
  const changeEvent = new Event('change', { bubbles: true });
  fileInput.dispatchEvent(changeEvent);
  
  console.log('✅ File uploaded via input:', fileName);
} else if (dropZone) {
  // Simulate drag and drop
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    dataTransfer: dataTransfer
  });
  
  dropZone.dispatchEvent(dropEvent);
  console.log('✅ File dropped on zone:', fileName);
} else {
  console.log('❌ No file input or drop zone found');
  console.log('💡 Data stored as window.uploadFileData for manual use');
  window.uploadFileData = fileData;
}
`;
    
    // Method 3: Direct API Call
    const apiMethod = `
// METHOD 3: DIRECT API CALL
// This attempts to call plugin functions directly

const apiData = ${JSON.stringify(scrapedData, null, 2)};

// Try multiple API patterns
const apiMethods = [
  () => window.figmaPluginAPI && window.figmaPluginAPI.importData(apiData),
  () => window.importToFigma && window.importToFigma(apiData),
  () => window.loadData && window.loadData(apiData),
  () => window.handleDataImport && window.handleDataImport(apiData),
  () => figma && figma.ui && figma.ui.postMessage({ type: 'import', data: apiData })
];

let success = false;
for (let i = 0; i < apiMethods.length; i++) {
  try {
    const result = apiMethods[i]();
    if (result !== undefined) {
      console.log('✅ API method ' + (i + 1) + ' succeeded');
      success = true;
      break;
    }
  } catch (e) {
    console.log('⚠️ API method ' + (i + 1) + ' failed:', e.message);
  }
}

if (!success) {
  console.log('📋 No API methods worked, storing data as window.apiTransferData');
  window.apiTransferData = apiData;
}
`;
    
    // Save all methods to separate files
    const methods = [
      { name: 'console-injection-' + timestamp + '.js', code: consoleInjection },
      { name: 'file-upload-' + timestamp + '.js', code: fileUploadMethod },
      { name: 'api-direct-' + timestamp + '.js', code: apiMethod }
    ];
    
    methods.forEach(method => {
      fs.writeFileSync(method.name, method.code);
      console.log('✅ Created transfer method:', method.name);
      
      // Also copy to desktop
      try {
        const desktopMethodPath = path.join(process.env.HOME, 'Desktop', method.name);
        fs.copyFileSync(method.name, desktopMethodPath);
      } catch (err) {
        // Ignore copy errors
      }
    });
    
    console.log('\n🎯 DIRECT FIGMA TRANSFER READY!');
    console.log('══════════════════════════════════════');
    console.log('📁 Files created:');
    console.log('   1. Data file:', filename);
    console.log('   2. Console injection: console-injection-' + timestamp + '.js');
    console.log('   3. File upload sim: file-upload-' + timestamp + '.js');
    console.log('   4. Direct API: api-direct-' + timestamp + '.js');
    
    console.log('\n🚀 TRANSFER INSTRUCTIONS:');
    console.log('1. Open your Figma plugin');
    console.log('2. Open browser console (F12) in the plugin');
    console.log('3. Try methods in this order:');
    console.log('   → First: Copy/paste console-injection-' + timestamp + '.js');
    console.log('   → If that fails: Try file-upload-' + timestamp + '.js');
    console.log('   → If that fails: Try api-direct-' + timestamp + '.js');
    console.log('4. One of these methods should automatically load your data!');
    
    console.log('\n✨ All files also saved to Desktop for easy access');
    console.log('🔄 Browser staying open for verification...');
    
  } catch (error) {
    console.error('❌ Direct sender error:', error.message);
  } finally {
    console.log('\nClose this browser when transfer is complete.');
  }
}

directFigmaSender();