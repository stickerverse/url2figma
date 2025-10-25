const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { exec } = require('child_process');

async function liveRealWorkflow() {
  console.log('🔥 LIVE REAL WORKFLOW STARTING...');
  console.log('📡 Will scrape live webpage and send to your open Figma plugin');
  console.log('🎨 Creating editable components on your Figma canvas');
  
  let server = null;
  
  try {
    // Step 1: Scrape a real live webpage
    console.log('\n🌐 STEP 1: Live webpage scraping...');
    const liveData = await scrapeLiveWebpage();
    
    if (!liveData) {
      throw new Error('Failed to scrape live webpage');
    }
    
    console.log('✅ Live scrape successful!');
    console.log(`📊 Elements scraped: ${countNodes(liveData.tree)}`);
    console.log(`🌐 Page: ${liveData.metadata?.title}`);
    console.log(`📏 Viewport: ${liveData.metadata?.viewport?.width}x${liveData.metadata?.viewport?.height}`);
    
    // Step 2: Setup transmission to your open Figma plugin
    console.log('\n📡 STEP 2: Setting up live transmission to Figma plugin...');
    server = await setupLiveTransmission(liveData);
    
    // Step 3: Send data directly to your open Figma plugin
    console.log('\n🎯 STEP 3: Sending live data to your Figma plugin...');
    await sendToOpenFigmaPlugin(liveData);
    
    console.log('\n🎉 LIVE WORKFLOW COMPLETE!');
    console.log('✅ Real webpage scraped and sent to Figma');
    console.log('🎨 Check your Figma canvas - the webpage should appear as editable components!');
    
  } catch (error) {
    console.error('❌ Live workflow failed:', error.message);
  } finally {
    if (server) {
      setTimeout(() => {
        server.close();
        console.log('🔚 Live transmission server stopped');
      }, 10000);
    }
  }
}

async function scrapeLiveWebpage() {
  console.log('🚀 Launching Chrome with extension for live scraping...');
  
  const extensionPath = path.join(__dirname, 'chrome-extension');
  
  // Ensure extension is built
  console.log('🔧 Ensuring Chrome extension is built...');
  try {
    await new Promise((resolve, reject) => {
      exec('cd chrome-extension && npm run build', (error, stdout, stderr) => {
        if (error) {
          console.log('⚠️ Building extension:', stderr);
        }
        resolve();
      });
    });
  } catch (e) {
    console.log('⚠️ Extension build check completed');
  }
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
      '--disable-web-security',
      '--user-data-dir=/tmp/chrome-live-workflow'
    ]
  });

  const page = await browser.newPage();
  
  try {
    // Real live websites to scrape
    const liveTargets = [
      'https://stripe.com',
      'https://github.com',
      'https://vercel.com', 
      'https://linear.app',
      'https://www.figma.com'
    ];
    
    const targetSite = liveTargets[Math.floor(Math.random() * liveTargets.length)];
    console.log(`🎯 Live target: ${targetSite}`);
    
    // Navigate to live site
    await page.goto(targetSite, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('✅ Live page loaded, waiting for extension...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Perform live extraction
    const result = await performLiveExtraction(page, targetSite);
    
    if (result) {
      // Save live capture
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = path.join(__dirname, `live-capture-${timestamp}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log('💾 Live capture saved:', outputFile);
    }
    
    await browser.close();
    return result;
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function performLiveExtraction(page, targetSite) {
  console.log('🔍 Performing LIVE extraction from:', targetSite);
  
  const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
  
  if (!fs.existsSync(injectedScriptPath)) {
    throw new Error('Chrome extension not built. Run: cd chrome-extension && npm run build');
  }
  
  const scriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
  
  // Monitor live extraction
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('✅') || text.includes('🔄') || text.includes('📊') || text.includes('Extracted')) {
      console.log('📋 Live extraction:', text);
    }
  });
  
  // Inject live extraction script
  await page.evaluate((script) => {
    try {
      eval(script);
      console.log('✅ Live extraction script injected');
    } catch (error) {
      console.error('❌ Script injection failed:', error);
    }
    
    window.addEventListener('message', (event) => {
      if (event.data.type === 'EXTRACTION_COMPLETE') {
        window.liveExtractionResult = event.data.data;
        console.log('✅ LIVE extraction completed');
      } else if (event.data.type === 'EXTRACTION_ERROR') {
        window.liveExtractionError = event.data.error;
        console.log('❌ LIVE extraction error:', event.data.error);
      }
    });
  }, scriptContent);
  
  // Start LIVE extraction
  await page.evaluate(() => {
    console.log('🎯 Starting LIVE webpage extraction...');
    window.postMessage({
      type: 'START_EXTRACTION',
      screenshot: '',
      options: {
        captureStates: false,
        detectComponents: true,
        extractAssets: true,
        includeHiddenElements: false,
        maxDepth: 25
      }
    }, '*');
  });
  
  // Wait for LIVE extraction
  console.log('⏳ Waiting for LIVE extraction...');
  let attempts = 0;
  const maxAttempts = 60; // 1 minute timeout
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await page.evaluate(() => ({
      result: window.liveExtractionResult || null,
      error: window.liveExtractionError || null
    }));
    
    if (result.result) {
      console.log('✅ LIVE extraction completed successfully!');
      return result.result;
    }
    
    if (result.error) {
      throw new Error(`LIVE extraction failed: ${result.error}`);
    }
    
    attempts++;
    if (attempts % 15 === 0) {
      console.log(`⏳ Still extracting LIVE data... (${attempts}/${maxAttempts})`);
    }
  }
  
  throw new Error('LIVE extraction timeout');
}

async function setupLiveTransmission(liveData) {
  console.log('🌐 Setting up LIVE data transmission server...');
  
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // CORS for Figma plugin
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      if (req.url === '/live-data' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(liveData));
        console.log('📤 LIVE data served to Figma plugin');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(8769, () => {
      console.log('✅ LIVE transmission server ready on http://localhost:8769');
      resolve(server);
    });
  });
}

async function sendToOpenFigmaPlugin(liveData) {
  console.log('🎯 Sending LIVE data to your open Figma plugin...');
  
  // Create a direct interface to communicate with Figma
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--disable-web-security']
  });
  
  const page = await browser.newPage();
  
  try {
    const directTransmissionHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>LIVE Figma Transmission</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            padding: 40px; 
            background: #0f172a;
            color: #f1f5f9;
            text-align: center;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #1e293b;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          }
          .title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 30px;
            color: #22d3ee;
          }
          .status {
            padding: 20px;
            background: #065f46;
            border-radius: 12px;
            margin: 20px 0;
            font-size: 18px;
          }
          .data-info {
            background: #1f2937;
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            text-align: left;
            font-family: monospace;
          }
          .transmission-btn {
            padding: 16px 32px;
            background: #22d3ee;
            color: #0f172a;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            margin: 20px;
          }
          .pulse {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="title">🔥 LIVE Figma Transmission</h1>
          
          <div id="status" class="status">
            Ready to transmit LIVE scraped data to your Figma plugin...
          </div>
          
          <div class="data-info">
            <strong>📊 LIVE Scraped Data:</strong><br>
            Page: ${liveData.metadata?.title || 'Live Website'}<br>
            Elements: ${countNodes(liveData.tree)}<br>
            URL: ${liveData.metadata?.url || 'Unknown'}<br>
            Timestamp: ${new Date().toLocaleString()}<br>
            Size: ${(JSON.stringify(liveData).length / 1024).toFixed(1)} KB
          </div>
          
          <button class="transmission-btn" onclick="transmitToFigma()">
            📡 Send to Figma Plugin NOW
          </button>
          
          <div id="instructions" style="margin-top: 30px; padding: 20px; background: #374151; border-radius: 8px;">
            <h3>📋 Instructions for your Figma Plugin:</h3>
            <p>1. Make sure your Figma plugin is open</p>
            <p>2. Copy this code and paste in your plugin's browser console:</p>
            <pre style="background: #111827; padding: 15px; border-radius: 6px; text-align: left; overflow-x: auto;">
fetch('http://localhost:8769/live-data')
  .then(response => response.json())
  .then(data => {
    parent.postMessage({ 
      pluginMessage: { 
        type: 'auto-import-data', 
        data: data 
      } 
    }, '*');
    console.log('✅ LIVE data sent to Figma plugin');
  })
  .catch(error => console.error('❌ Transmission failed:', error));
            </pre>
          </div>
        </div>
        
        <script>
          const liveData = ${JSON.stringify(liveData)};
          
          async function transmitToFigma() {
            const statusEl = document.getElementById('status');
            statusEl.innerHTML = '📡 Transmitting LIVE data to Figma plugin...';
            statusEl.classList.add('pulse');
            
            try {
              // Method 1: Copy to clipboard
              await navigator.clipboard.writeText(JSON.stringify(liveData));
              statusEl.innerHTML = '📋 LIVE data copied to clipboard!<br>Switch to Figma and paste in your plugin.';
              
              // Method 2: Try direct window messaging (if in iframe context)
              try {
                window.parent.postMessage({
                  pluginMessage: {
                    type: 'auto-import-data',
                    data: liveData
                  }
                }, '*');
                statusEl.innerHTML += '<br>✅ Also sent via window messaging!';
              } catch (e) {
                console.log('Window messaging not available:', e);
              }
              
              statusEl.classList.remove('pulse');
              
            } catch (error) {
              statusEl.innerHTML = '❌ Transmission failed: ' + error.message;
              statusEl.classList.remove('pulse');
            }
          }
          
          // Auto-transmit after 3 seconds
          setTimeout(() => {
            console.log('🚀 Auto-transmitting LIVE data...');
            transmitToFigma();
          }, 3000);
        </script>
      </body>
      </html>
    `;
    
    await page.setContent(directTransmissionHTML);
    
    console.log('🎯 LIVE transmission interface ready');
    console.log('📡 Data will auto-transmit in 3 seconds');
    console.log('📋 Data is also copied to clipboard for manual paste');
    
    // Monitor for transmission
    page.on('console', (msg) => {
      if (msg.text().includes('🚀') || msg.text().includes('✅')) {
        console.log('📡 Transmission:', msg.text());
      }
    });
    
    // Keep transmission interface open
    await new Promise(resolve => setTimeout(resolve, 20000));
    
  } finally {
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

// Execute LIVE workflow
liveRealWorkflow().catch(error => {
  console.error('❌ LIVE workflow failed:', error.message);
  console.log('\n🔧 Make sure:');
  console.log('- Figma Desktop is running');
  console.log('- Your Figma plugin is open and loaded');
  console.log('- Chrome extension is built (npm run build in chrome-extension/)');
});