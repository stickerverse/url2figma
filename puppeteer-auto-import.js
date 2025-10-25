#!/usr/bin/env node
/**
 * Puppeteer Auto Import to Figma
 *
 * This script:
 * 1. Opens a URL in Puppeteer
 * 2. Injects the DOM extractor to capture the page
 * 3. Sends data to the handoff server
 * 4. Figma plugin auto-imports from the server
 *
 * Usage:
 *   node puppeteer-auto-import.js https://example.com
 *   node puppeteer-auto-import.js https://github.com/features
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Handoff server URL
const HANDOFF_SERVER = 'http://127.0.0.1:4411';

async function autoImportToFigma(url) {
  console.log('🚀 Puppeteer Auto Import to Figma');
  console.log('=' .repeat(80));
  console.log(`📍 Target URL: ${url}`);
  console.log(`🔌 Handoff Server: ${HANDOFF_SERVER}`);
  console.log('=' .repeat(80));

  // Check if handoff server is running
  try {
    const healthCheck = await fetch(`${HANDOFF_SERVER}/health`);
    const health = await healthCheck.json();
    console.log('✅ Handoff server is running');
    console.log(`   Queue: ${health.queueLength} jobs`);
  } catch (error) {
    console.error('❌ Handoff server is not running!');
    console.log('💡 Start it with: npm run handoff-server');
    process.exit(1);
  }

  console.log('\n🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    devtools: false,
    args: ['--window-size=1920,1080']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`📡 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('✅ Page loaded');

    console.log('\n💉 Injecting DOM extractor...');

    // Read the injected script from the built extension
    const injectedScriptPath = path.join(__dirname, 'chrome-extension/dist/injected-script.js');
    if (!fs.existsSync(injectedScriptPath)) {
      throw new Error(`Injected script not found at: ${injectedScriptPath}\nRun: cd chrome-extension && npm run build`);
    }

    const injectedScript = fs.readFileSync(injectedScriptPath, 'utf8');

    // Inject the script into the page
    await page.evaluate(injectedScript);
    console.log('✅ DOM extractor injected');

    // Execute the extraction using message-based protocol
    console.log('🔍 Extracting page data...');
    const captureData = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Extraction timeout after 60 seconds'));
        }, 60000);

        // Listen for extraction completion
        const messageHandler = (event) => {
          if (event.data.type === 'EXTRACTION_COMPLETE') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            resolve(event.data.data);
          } else if (event.data.type === 'EXTRACTION_ERROR') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageHandler);

        // Start extraction
        window.postMessage({ type: 'START_EXTRACTION' }, '*');
      });
    });

    console.log('✅ Page data extracted');
    console.log(`   Elements: ${countNodes(captureData.tree)}`);
    console.log(`   Title: ${captureData.metadata.title}`);

    // Take a screenshot
    console.log('\n📸 Taking screenshot...');
    const screenshotBuffer = await page.screenshot({ encoding: 'base64', fullPage: false });
    captureData.screenshot = `data:image/png;base64,${screenshotBuffer}`;
    console.log('✅ Screenshot captured');

    // Save JSON locally (optional)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `capture-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(captureData, null, 2));
    console.log(`💾 Saved to: ${filename}`);

    // Send to handoff server
    console.log(`\n🚀 Sending to handoff server...`);
    const response = await fetch(`${HANDOFF_SERVER}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(captureData)
    });

    if (!response.ok) {
      throw new Error(`Handoff server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Data sent to handoff server');
    console.log(`   Job ID: ${result.id}`);
    console.log(`   Queue length: ${result.queueLength}`);

    console.log('\n🎨 Figma Plugin Instructions:');
    console.log('=' .repeat(80));
    console.log('1. Open your Figma plugin (if not already open)');
    console.log('2. Watch the status lights:');
    console.log('   🟢 Handoff Server - should be green');
    console.log('   🟢 Data Reception - will turn green when received');
    console.log('   🟡 Figma Import - will pulse yellow during import');
    console.log('   🟢 Figma Import - will turn green when complete');
    console.log('3. Import will start automatically in ~2.5 seconds!');
    console.log('=' .repeat(80));

    console.log('\n⏳ Waiting 5 seconds for Figma to import...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n🎉 Process complete!');
    console.log('📊 Check your Figma canvas for the imported design.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
  }
}

function countNodes(node) {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// Main execution
const url = process.argv[2] || 'https://example.com';

if (!url.startsWith('http://') && !url.startsWith('https://')) {
  console.error('❌ Invalid URL. Must start with http:// or https://');
  console.log('Usage: node puppeteer-auto-import.js <url>');
  console.log('Example: node puppeteer-auto-import.js https://github.com/features');
  process.exit(1);
}

autoImportToFigma(url).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
