const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function runCompleteWorkflow() {
  console.log('🚀 Starting complete HTML to Figma workflow...');
  
  const extensionPath = path.join(__dirname, 'chrome-extension');
  console.log('📁 Extension path:', extensionPath);
  
  // Launch Chrome with the extension loaded
  const browser = await puppeteer.launch({
    headless: false, // Run with UI to see what's happening
    devtools: true,
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--user-data-dir=/tmp/chrome-test-profile'
    ]
  });

  try {
    // Step 1: Capture webpage data
    console.log('\n🔥 STEP 1: Capturing webpage data...');
    const captureResult = await captureWebpageData(browser);
    
    if (!captureResult) {
      throw new Error('Failed to capture webpage data');
    }
    
    console.log('✅ Webpage data captured successfully!');
    
    // Step 2: Open Figma plugin and send data
    console.log('\n🔥 STEP 2: Sending data to Figma plugin...');
    
    // First, let's check if we have Figma running
    console.log('📋 Captured data structure:');
    console.log('  - Tree nodes:', countNodes(captureResult.tree));
    console.log('  - Has assets:', !!captureResult.assets);
    console.log('  - Has styles:', !!captureResult.styles);
    console.log('  - Page title:', captureResult.metadata?.title);
    
    // Save the complete JSON for manual transfer to Figma
    const outputFile = path.join(__dirname, 'figma-ready-data.json');
    fs.writeFileSync(outputFile, JSON.stringify(captureResult, null, 2));
    console.log('💾 Figma-ready data saved to:', outputFile);
    
    // Display instructions for manual Figma import
    console.log('\n🎯 FIGMA PLUGIN INSTRUCTIONS:');
    console.log('1. Make sure your Figma plugin is open and waiting');
    console.log('2. Copy the contents of figma-ready-data.json');
    console.log('3. In the Figma plugin, click "Paste from Clipboard"');
    console.log('4. Click "Import to Figma" with your desired options');
    
    // Step 3: Simulate Figma plugin interaction (for demonstration)
    console.log('\n🔥 STEP 3: Simulating Figma plugin workflow...');
    await simulateFigmaPlugin(captureResult);
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
  }
}

async function captureWebpageData(browser) {
  const page = await browser.newPage();
  
  try {
    // Navigate to a more interesting test page
    const testUrls = [
      'https://github.com',  // Complex layout with navigation, cards, etc.
      'https://news.ycombinator.com',  // Simple but structured
      'https://example.com',  // Fallback simple page
    ];
    
    let captureResult = null;
    
    for (const testUrl of testUrls) {
      try {
        console.log(`🌐 Trying to capture: ${testUrl}`);
        
        await page.goto(testUrl, { 
          waitUntil: 'networkidle2',
          timeout: 10000 
        });
        
        console.log('✅ Page loaded successfully');
        
        // Wait for the extension to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Simulate the extension capture
        captureResult = await simulateExtensionCapture(page);
        
        if (captureResult) {
          console.log('🎉 Successfully captured data from:', testUrl);
          break;
        }
        
      } catch (error) {
        console.log(`⚠️  Failed to capture ${testUrl}:`, error.message);
        continue;
      }
    }
    
    await page.close();
    return captureResult;
    
  } catch (error) {
    await page.close();
    throw error;
  }
}

async function simulateExtensionCapture(page) {
  console.log('🎭 Simulating extension capture process...');
  
  const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
  
  try {
    const injectedScriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
    
    // Monitor console logs
    page.on('console', (msg) => {
      if (msg.text().includes('🌐') || msg.text().includes('📨') || msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log('📋 Browser console:', msg.text());
      }
    });
    
    // Inject the script content
    await page.evaluate((scriptContent) => {
      try {
        eval(scriptContent);
        console.log('✅ Injected script content loaded');
      } catch (error) {
        console.error('❌ Failed to evaluate injected script:', error);
      }
    }, injectedScriptContent);
    
    // Set up result listener
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'EXTRACTION_COMPLETE') {
          window.extractionResult = event.data.data;
          console.log('✅ Extraction result captured');
        } else if (event.data.type === 'EXTRACTION_ERROR') {
          window.extractionError = event.data.error;
          console.log('❌ Extraction error captured:', event.data.error);
        }
      });
    });
    
    // Trigger the extraction
    await page.evaluate(() => {
      console.log('🎯 Sending START_EXTRACTION message...');
      window.postMessage({
        type: 'START_EXTRACTION',
        screenshot: '',
        options: {
          captureStates: false,
          detectComponents: true,
          extractAssets: true
        }
      }, '*');
    });
    
    // Wait for completion
    console.log('⏳ Waiting for extraction to complete...');
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await page.evaluate(() => {
        return {
          extractionResult: window.extractionResult || null,
          extractionError: window.extractionError || null
        };
      });
      
      if (result.extractionResult) {
        console.log('✅ Extraction completed successfully!');
        return result.extractionResult;
      } else if (result.extractionError) {
        console.log('❌ Extraction failed with error:', result.extractionError);
        return null;
      }
      
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts}...`);
    }
    
    console.log('⏰ Extraction timeout after', maxAttempts, 'seconds');
    return null;
    
  } catch (error) {
    console.error('❌ Failed to simulate capture:', error.message);
    return null;
  }
}

async function simulateFigmaPlugin(data) {
  console.log('🎨 Simulating Figma plugin processing...');
  
  // Simulate the plugin's import process
  const importOptions = {
    createMainFrame: true,
    createVariantsFrame: false,
    createComponentsFrame: true,
    createDesignSystem: true,
    applyAutoLayout: true,
    createStyles: true
  };
  
  console.log('📋 Import options:', importOptions);
  
  // Simulate progress updates
  const steps = [
    'Loading fonts...',
    'Processing DOM tree...',
    'Creating Figma nodes...',
    'Applying styles...',
    'Building components...',
    'Finalizing layout...'
  ];
  
  for (let i = 0; i < steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const percent = Math.round(((i + 1) / steps.length) * 100);
    console.log(`🔄 ${steps[i]} (${percent}%)`);
  }
  
  const stats = {
    elements: countNodes(data.tree),
    components: data.components ? Object.keys(data.components).length : 0,
    frames: countFrameNodes(data.tree),
    styles: data.styles ? Object.keys(data.styles).length : 0
  };
  
  console.log('🎉 Simulated Figma import complete!');
  console.log('📊 Final stats:', stats);
  
  return stats;
}

function countNodes(node) {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function countFrameNodes(node) {
  let count = node.type === 'FRAME' ? 1 : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countFrameNodes(child);
    }
  }
  return count;
}

// Run the complete workflow
runCompleteWorkflow().catch(console.error);