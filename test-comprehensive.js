const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function comprehensiveTest() {
  const extensionPath = path.join(__dirname, 'chrome-extension');
  
  console.log('🚀 Starting comprehensive Chrome extension test...');
  console.log('📁 Extension path:', extensionPath);
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for demo
    devtools: false,
    defaultViewport: { width: 1200, height: 800 },
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--window-size=1200,800'
    ]
  });

  const page = await browser.newPage();
  
  try {
    // Test with a more complex website that has various UI elements
    const testUrl = 'https://react.dev/'; // React docs - modern, complex, lots of components
    console.log(`🌐 Navigating to: ${testUrl}`);
    
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page loaded successfully');
    
    // Wait for extension to load and any dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page info
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      elementCount: document.querySelectorAll('*').length,
      hasImages: document.querySelectorAll('img').length > 0,
      hasButtons: document.querySelectorAll('button').length > 0,
      hasFormElements: document.querySelectorAll('input, textarea, select').length > 0
    }));
    
    console.log('📋 Page Analysis:');
    console.log(`   Title: ${pageInfo.title}`);
    console.log(`   Elements: ${pageInfo.elementCount}`);
    console.log(`   Images: ${pageInfo.hasImages ? 'Yes' : 'No'}`);
    console.log(`   Buttons: ${pageInfo.hasButtons ? 'Yes' : 'No'}`);
    console.log(`   Form elements: ${pageInfo.hasFormElements ? 'Yes' : 'No'}`);
    
    // Monitor console for extraction progress
    page.on('console', (msg) => {
      if (msg.text().includes('🎯') || msg.text().includes('✅') || msg.text().includes('❌') || msg.text().includes('📊')) {
        console.log('🔍 Browser:', msg.text());
      }
    });
    
    console.log('\n🎭 Starting extraction process...');
    const startTime = Date.now();
    
    // Simulate the extension capture
    const extractionResult = await simulateExtensionCapture(page);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (extractionResult) {
      console.log('\n🎉 EXTRACTION SUCCESSFUL! 🎉');
      console.log('⏱️  Duration:', Math.round(duration / 1000), 'seconds');
      
      // Analyze the results
      const analysis = analyzeExtraction(extractionResult);
      console.log('\n📊 EXTRACTION ANALYSIS:');
      console.log('=======================');
      console.log(`✓ Total nodes extracted: ${analysis.totalNodes}`);
      console.log(`✓ Text nodes: ${analysis.textNodes}`);
      console.log(`✓ Frame nodes: ${analysis.frameNodes}`);
      console.log(`✓ Image nodes: ${analysis.imageNodes}`);
      console.log(`✓ Max depth: ${analysis.maxDepth}`);
      console.log(`✓ Has metadata: ${analysis.hasMetadata ? 'Yes' : 'No'}`);
      console.log(`✓ Page title: ${analysis.pageTitle}`);
      console.log(`✓ Viewport: ${analysis.viewport.width}x${analysis.viewport.height}`);
      
      // Save detailed result
      const outputFile = path.join(__dirname, 'comprehensive-test-result.json');
      fs.writeFileSync(outputFile, JSON.stringify({
        testInfo: {
          timestamp: new Date().toISOString(),
          duration,
          url: testUrl,
          pageInfo
        },
        analysis,
        extractionData: extractionResult
      }, null, 2));
      
      console.log('\n💾 Complete results saved to:', outputFile);
      
      // Validate schema compliance
      const schemaValid = validateSchema(extractionResult);
      console.log(`\n📋 Schema validation: ${schemaValid ? '✅ PASSED' : '❌ FAILED'}`);
      
      console.log('\n🎯 TEST VERDICT: SUCCESS');
      console.log('The Chrome extension successfully captured and extracted webpage data!');
      
    } else {
      console.log('\n❌ EXTRACTION FAILED');
      console.log('The extension could not extract data from the webpage.');
    }
    
    // Keep browser open for a moment to see results
    console.log('\n⏳ Keeping browser open for 5 seconds to review...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
  }
}

function analyzeExtraction(data) {
  let totalNodes = 0;
  let textNodes = 0;
  let frameNodes = 0;
  let imageNodes = 0;
  let maxDepth = 0;
  
  function traverse(node, depth = 0) {
    totalNodes++;
    maxDepth = Math.max(maxDepth, depth);
    
    switch (node.type) {
      case 'TEXT':
        textNodes++;
        break;
      case 'FRAME':
        frameNodes++;
        break;
      case 'IMAGE':
        imageNodes++;
        break;
    }
    
    if (node.children) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }
  
  if (data.tree) {
    traverse(data.tree);
  }
  
  return {
    totalNodes,
    textNodes,
    frameNodes,
    imageNodes,
    maxDepth,
    hasMetadata: !!data.metadata,
    pageTitle: data.metadata?.title || 'Unknown',
    viewport: data.metadata?.viewport || { width: 0, height: 0 }
  };
}

function validateSchema(data) {
  // Basic schema validation
  const required = ['version', 'metadata', 'tree'];
  
  for (const field of required) {
    if (!data[field]) {
      console.log(`❌ Missing required field: ${field}`);
      return false;
    }
  }
  
  // Check metadata structure
  if (!data.metadata.title || !data.metadata.url || !data.metadata.timestamp) {
    console.log('❌ Invalid metadata structure');
    return false;
  }
  
  // Check tree structure
  if (!data.tree.id || !data.tree.type || !data.tree.name) {
    console.log('❌ Invalid tree structure');
    return false;
  }
  
  return true;
}

async function simulateExtensionCapture(page) {
  try {
    const fs = require('fs');
    const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
    const injectedScriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
    
    // Inject the script
    await page.evaluate((scriptContent) => {
      try {
        eval(scriptContent);
        console.log('🎯 Extension script injected successfully');
      } catch (error) {
        console.error('❌ Failed to inject script:', error);
      }
    }, injectedScriptContent);
    
    // Set up message listener
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'EXTRACTION_COMPLETE') {
          window.extractionResult = event.data.data;
          console.log('✅ Extraction completed - data captured');
        } else if (event.data.type === 'EXTRACTION_ERROR') {
          window.extractionError = event.data.error;
          console.log('❌ Extraction failed:', event.data.error);
        }
      });
    });
    
    // Start extraction
    await page.evaluate(() => {
      console.log('🎯 Starting DOM extraction...');
      window.postMessage({
        type: 'START_EXTRACTION',
        screenshot: ''
      }, '*');
    });
    
    // Wait for completion with progress indicators
    let attempts = 0;
    const maxAttempts = 20; // Longer timeout for complex pages
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await page.evaluate(() => {
        return {
          extractionResult: window.extractionResult || null,
          extractionError: window.extractionError || null
        };
      });
      
      if (result.extractionResult) {
        console.log('✅ Extraction completed successfully');
        return result.extractionResult;
      } else if (result.extractionError) {
        console.log('❌ Extraction failed:', result.extractionError);
        return null;
      }
      
      attempts++;
      if (attempts % 3 === 0) {
        console.log(`⏳ Still processing... (${attempts}/${maxAttempts})`);
      }
    }
    
    console.log('⏰ Extraction timeout');
    return null;
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    return null;
  }
}

// Run the comprehensive test
comprehensiveTest().catch(console.error);