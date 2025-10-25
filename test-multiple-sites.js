const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testMultipleSites() {
  const extensionPath = path.join(__dirname, 'chrome-extension');
  
  console.log('🚀 Starting multi-site Chrome extension test...');
  
  // Test URLs with different complexity levels
  const testSites = [
    { url: 'https://example.com', name: 'example', description: 'Simple static page' },
    { url: 'https://httpbin.org/html', name: 'httpbin', description: 'HTML test page' },
    { url: 'https://github.com', name: 'github', description: 'Complex modern site' },
    { url: 'https://news.ycombinator.com', name: 'hackernews', description: 'Text-heavy site' }
  ];

  const browser = await puppeteer.launch({
    headless: true, // Run headless for faster testing
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const results = [];

  for (const site of testSites) {
    console.log(`\n🌐 Testing: ${site.description} (${site.url})`);
    
    const page = await browser.newPage();
    let success = false;
    let extractionResult = null;
    let error = null;

    try {
      // Navigate to the site
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 30000 });
      console.log('✅ Page loaded successfully');
      
      // Wait for extension to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate extraction
      extractionResult = await simulateExtensionCapture(page);
      
      if (extractionResult) {
        success = true;
        console.log('🎉 Extraction successful!');
        console.log('📊 Result summary:', {
          hasTree: !!extractionResult.tree,
          treeNodeCount: extractionResult.tree ? countNodes(extractionResult.tree) : 0,
          title: extractionResult.metadata?.title || 'Unknown'
        });
        
        // Save result
        const outputFile = path.join(__dirname, `test-${site.name}-result.json`);
        fs.writeFileSync(outputFile, JSON.stringify(extractionResult, null, 2));
        console.log('💾 Result saved to:', outputFile);
      } else {
        console.log('❌ Extraction failed - no result');
      }
      
    } catch (err) {
      error = err.message;
      console.error('❌ Test failed:', error);
    } finally {
      await page.close();
    }
    
    results.push({
      site: site.name,
      url: site.url,
      description: site.description,
      success,
      nodeCount: extractionResult?.tree ? countNodes(extractionResult.tree) : 0,
      title: extractionResult?.metadata?.title || null,
      error
    });
  }

  await browser.close();
  
  // Print summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  
  let successCount = 0;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.site.padEnd(12)} | ${result.nodeCount.toString().padStart(4)} nodes | ${result.description}`);
    if (result.success) successCount++;
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Success Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  // Save summary
  const summaryFile = path.join(__dirname, 'test-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    successCount,
    successRate: successCount / results.length,
    results
  }, null, 2));
  
  console.log('📋 Summary saved to:', summaryFile);
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

async function simulateExtensionCapture(page) {
  try {
    // Inject the extension script
    const fs = require('fs');
    const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
    const injectedScriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
    
    await page.evaluate((scriptContent) => {
      try {
        eval(scriptContent);
      } catch (error) {
        console.error('Failed to evaluate injected script:', error);
      }
    }, injectedScriptContent);
    
    // Set up result listener
    await page.evaluate(() => {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'EXTRACTION_COMPLETE') {
          window.extractionResult = event.data.data;
        } else if (event.data.type === 'EXTRACTION_ERROR') {
          window.extractionError = event.data.error;
        }
      });
    });
    
    // Trigger extraction
    await page.evaluate(() => {
      window.postMessage({
        type: 'START_EXTRACTION',
        screenshot: ''
      }, '*');
    });
    
    // Wait for completion
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await page.evaluate(() => {
        return {
          extractionResult: window.extractionResult || null,
          extractionError: window.extractionError || null
        };
      });
      
      if (result.extractionResult) {
        return result.extractionResult;
      } else if (result.extractionError) {
        console.log('Extraction error:', result.extractionError);
        return null;
      }
      
      attempts++;
    }
    
    return null;
    
  } catch (error) {
    console.error('Failed to simulate capture:', error.message);
    return null;
  }
}

// Run the test
testMultipleSites().catch(console.error);