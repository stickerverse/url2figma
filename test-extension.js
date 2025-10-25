const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testChromeExtension() {
  const extensionPath = path.join(__dirname, 'chrome-extension');
  
  console.log('🚀 Starting Chrome extension test...');
  console.log('📁 Extension path:', extensionPath);
  
  // Launch Chrome with the extension loaded
  const browser = await puppeteer.launch({
    headless: false, // Run with UI to see what's happening
    devtools: true,
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const page = await browser.newPage();
  
  try {
    // Navigate to a test webpage
    const testUrl = 'https://example.com';
    console.log(`🌐 Navigating to: ${testUrl}`);
    
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    console.log('✅ Page loaded successfully');
    
    // Wait a bit for the extension to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Testing extension interaction...');
    
    // Get the extension ID (we'll need to find it dynamically)
    const extensionId = await getExtensionId(page);
    console.log('🆔 Extension ID:', extensionId);
    
    // Set up listener for messages from content script to background
    let extractionResult = null;
    let captureComplete = false;
    
    // Monitor console logs to see extension activity
    page.on('console', (msg) => {
      if (msg.text().includes('🌐') || msg.text().includes('📨') || msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log('📋 Browser console:', msg.text());
      }
    });
    
    // Simulate the popup triggering capture by sending message to content script
    console.log('🎯 Triggering capture via extension message...');
    
    try {
      // Inject the content script manually if it's not already there
      await page.evaluate(() => {
        // Check if content script is loaded by looking for its console message
        if (!window.contentScriptLoaded) {
          console.log('📦 Manually injecting content script functionality...');
          // We'll simulate the capture process directly
          return false;
        }
        return true;
      });
      
      // Wait a moment and then try to trigger the extension
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Since we can't easily trigger the actual extension popup in headless mode,
      // let's simulate the extraction process by manually injecting and running the scripts
      await simulateExtensionCapture(page);
      
      // Check for results
      extractionResult = await page.evaluate(() => {
        return window.extractionResult || null;
      });
      
    } catch (error) {
      console.log('⚠️  Direct extension trigger failed, trying manual simulation:', error.message);
      await simulateExtensionCapture(page);
    }
    
    // Check for results one more time
    extractionResult = await page.evaluate(() => {
      return window.extractionResult || null;
    });
    
    if (extractionResult) {
      console.log('🎉 Extraction successful!');
      console.log('📊 Result summary:', {
        hasTree: !!extractionResult.tree,
        hasAssets: !!extractionResult.assets,
        hasStyles: !!extractionResult.styles,
        treeNodeCount: extractionResult.tree ? countNodes(extractionResult.tree) : 0
      });
      
      // Save the result to a file for inspection
      const outputFile = path.join(__dirname, 'test-extraction-result.json');
      fs.writeFileSync(outputFile, JSON.stringify(extractionResult, null, 2));
      console.log('💾 Result saved to:', outputFile);
    } else {
      console.log('❌ No extraction result found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('🔚 Closing browser...');
    await browser.close();
  }
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

async function getExtensionId(page) {
  try {
    // Try to get extension ID from the page context
    return await page.evaluate(() => {
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.id) {
        return window.chrome.runtime.id;
      }
      return 'unknown';
    });
  } catch {
    return 'unknown';
  }
}

async function simulateExtensionCapture(page) {
  console.log('🎭 Simulating extension capture process...');
  
  // First, let's manually inject the content needed for DOM extraction
  const fs = require('fs');
  const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
  
  try {
    const injectedScriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
    
    // Inject the script content directly into the page
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
        screenshot: ''
      }, '*');
    });
    
    // Wait for completion
    console.log('⏳ Waiting for extraction to complete...');
    let attempts = 0;
    const maxAttempts = 15;
    
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

// Run the test
testChromeExtension().catch(console.error);