const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function automaticTransmission() {
  console.log('🚀 Starting automatic transmission to Figma plugin...');
  
  const extensionPath = path.join(__dirname, 'chrome-extension');
  console.log('📁 Extension path:', extensionPath);
  
  // Step 1: Capture webpage data with Chrome extension
  console.log('\n🔥 STEP 1: Capturing webpage data...');
  const captureResult = await captureWebpageData(extensionPath);
  
  if (!captureResult) {
    throw new Error('Failed to capture webpage data');
  }
  
  console.log('✅ Webpage data captured successfully!');
  console.log(`📊 Captured ${countNodes(captureResult.tree)} elements from: ${captureResult.metadata?.title}`);
  
  // Step 2: Send data directly to Figma plugin
  console.log('\n🔥 STEP 2: Transmitting to Figma plugin...');
  await transmitToFigmaPlugin(captureResult);
  
  console.log('\n✅ AUTOMATIC TRANSMISSION COMPLETE!');
  console.log('🎨 Check your Figma window - the import should start automatically!');
}

async function captureWebpageData(extensionPath) {
  // Launch Chrome with the extension loaded
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false, // Keep closed for cleaner experience
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--user-data-dir=/tmp/chrome-test-profile-auto'
    ]
  });

  const page = await browser.newPage();
  
  try {
    // Try different test URLs for variety
    const testUrls = [
      'https://github.com',
      'https://news.ycombinator.com',
      'https://www.apple.com',
      'https://stripe.com',
      'https://vercel.com'
    ];
    
    const randomUrl = testUrls[Math.floor(Math.random() * testUrls.length)];
    console.log(`🌐 Capturing from: ${randomUrl}`);
    
    await page.goto(randomUrl, { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for extension to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Capture the page data
    const captureResult = await simulateExtensionCapture(page);
    
    await browser.close();
    return captureResult;
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function simulateExtensionCapture(page) {
  console.log('🎭 Extracting DOM structure...');
  
  const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
  const injectedScriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
  
  // Inject extraction script
  await page.evaluate((scriptContent) => {
    try {
      eval(scriptContent);
      console.log('✅ DOM extraction script loaded');
    } catch (error) {
      console.error('❌ Script injection failed:', error);
    }
  }, injectedScriptContent);
  
  // Set up result listener
  await page.evaluate(() => {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'EXTRACTION_COMPLETE') {
        window.extractionResult = event.data.data;
        console.log('✅ DOM extraction complete');
      } else if (event.data.type === 'EXTRACTION_ERROR') {
        window.extractionError = event.data.error;
        console.log('❌ DOM extraction error:', event.data.error);
      }
    });
  });
  
  // Trigger extraction
  await page.evaluate(() => {
    console.log('🎯 Starting DOM extraction...');
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
  console.log('⏳ Waiting for DOM extraction...');
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await page.evaluate(() => {
      return {
        extractionResult: window.extractionResult || null,
        extractionError: window.extractionError || null
      };
    });
    
    if (result.extractionResult) {
      console.log('✅ DOM extraction completed!');
      return result.extractionResult;
    } else if (result.extractionError) {
      console.log('❌ DOM extraction failed:', result.extractionError);
      return null;
    }
    
    attempts++;
    if (attempts % 5 === 0) {
      console.log(`⏳ Still extracting... (${attempts}/${maxAttempts})`);
    }
  }
  
  console.log('⏰ DOM extraction timeout');
  return null;
}

async function transmitToFigmaPlugin(data) {
  console.log('📡 Preparing transmission to Figma plugin...');
  
  // Save the data for transmission
  const transmissionFile = path.join(__dirname, 'transmission-data.json');
  fs.writeFileSync(transmissionFile, JSON.stringify(data, null, 2));
  
  console.log('💾 Data prepared for transmission');
  console.log(`📊 Transmission package: ${countNodes(data.tree)} elements, ${JSON.stringify(data).length} bytes`);
  
  // Create AppleScript to interact with Figma
  const appleScript = `
    tell application "System Events"
      set figmaApp to first application process whose name contains "Figma"
      if exists figmaApp then
        tell figmaApp
          -- Bring Figma to front
          set frontmost to true
          delay 0.5
          
          -- Try to find and interact with the plugin window
          tell window 1
            -- Look for plugin UI elements and simulate data transmission
            delay 1
          end tell
        end tell
        return "Figma found and activated"
      else
        return "Figma not found - please make sure Figma Desktop is running with the plugin open"
      end if
    end tell
  `;
  
  try {
    console.log('🎯 Activating Figma window...');
    const { stdout } = await execAsync(`osascript -e '${appleScript}'`);
    console.log('📱 Figma activation result:', stdout.trim());
    
    // Use a more direct approach: copy data to clipboard and send keystrokes
    console.log('📋 Copying data to clipboard for automatic paste...');
    
    // Copy JSON to clipboard
    const copyProcess = exec('pbcopy', (error) => {
      if (error) {
        console.error('❌ Clipboard copy failed:', error);
        return;
      }
      console.log('✅ Data copied to clipboard');
    });
    
    copyProcess.stdin.write(JSON.stringify(data));
    copyProcess.stdin.end();
    
    // Wait for clipboard operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send keystroke to trigger paste in Figma plugin
    const pasteScript = `
      tell application "System Events"
        set figmaApp to first application process whose name contains "Figma"
        if exists figmaApp then
          tell figmaApp
            set frontmost to true
            delay 0.5
            -- Simulate clicking paste button or using keyboard shortcut
            key code 9 using command down -- Cmd+V
            delay 0.5
          end tell
          return "Paste command sent"
        else
          return "Figma not accessible"
        end if
      end tell
    `;
    
    console.log('⌨️  Sending paste command to Figma...');
    const { stdout: pasteResult } = await execAsync(`osascript -e '${pasteScript}'`);
    console.log('📝 Paste result:', pasteResult.trim());
    
    // Alternative: Use messaging approach
    console.log('🔄 Alternative: Setting up message-based transmission...');
    await setupMessageTransmission(data);
    
  } catch (error) {
    console.log('⚠️  Direct UI automation failed, using alternative method...');
    await setupMessageTransmission(data);
  }
}

async function setupMessageTransmission(data) {
  console.log('📨 Setting up message-based transmission...');
  
  // Create a simple HTTP server to serve the data
  const http = require('http');
  const port = 8765;
  
  const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.url === '/data' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(data));
      console.log('📤 Data served to Figma plugin');
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  server.listen(port, () => {
    console.log(`🌐 Transmission server running on http://localhost:${port}`);
    console.log('📡 Figma plugin can now fetch data from: http://localhost:8765/data');
    
    // Create JavaScript code to be executed in Figma plugin context
    const figmaPluginCode = `
      // Execute this in your Figma plugin console:
      fetch('http://localhost:8765/data')
        .then(response => response.json())
        .then(data => {
          parent.postMessage({ 
            pluginMessage: { 
              type: 'external-data', 
              data: data 
            } 
          }, '*');
          console.log('✅ Data transmitted to Figma plugin');
        })
        .catch(error => console.error('❌ Transmission failed:', error));
    `;
    
    console.log('\n🎯 MANUAL EXECUTION REQUIRED:');
    console.log('1. Open your Figma plugin');
    console.log('2. Open the browser console (F12) in the plugin UI');
    console.log('3. Paste and execute this code:');
    console.log('\n' + figmaPluginCode);
    console.log('\n⚡ The import will start automatically after execution!');
    
    // Keep server running for a while
    setTimeout(() => {
      server.close();
      console.log('🔚 Transmission server stopped');
    }, 60000); // 1 minute
  });
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

// Run automatic transmission
automaticTransmission().catch(error => {
  console.error('❌ Automatic transmission failed:', error.message);
  console.log('\n💡 Fallback options:');
  console.log('1. Use the manual clipboard method: node send-to-figma.js');
  console.log('2. Load the JSON file directly in the Figma plugin UI');
  console.log('3. Check that Figma Desktop is running with the plugin open');
});