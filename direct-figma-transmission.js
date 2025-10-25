const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');

async function directFigmaTransmission() {
  console.log('🚀 Starting direct Figma transmission...');
  
  // Step 1: Capture webpage data
  console.log('\n🔥 STEP 1: Capturing fresh webpage data...');
  const captureResult = await captureWebpageWithExtension();
  
  if (!captureResult) {
    throw new Error('Failed to capture webpage data');
  }
  
  console.log('✅ Fresh data captured successfully!');
  console.log(`📊 Elements: ${countNodes(captureResult.tree)}, Page: ${captureResult.metadata?.title}`);
  
  // Step 2: Set up transmission server
  console.log('\n🔥 STEP 2: Setting up direct transmission...');
  const server = await setupTransmissionServer(captureResult);
  
  // Step 3: Open Figma plugin and auto-execute
  console.log('\n🔥 STEP 3: Launching Figma plugin automation...');
  await autoExecuteFigmaPlugin(captureResult);
  
  // Keep server running for transmission
  console.log('\n⏳ Keeping transmission server active...');
  setTimeout(() => {
    server.close();
    console.log('🔚 Transmission complete!');
  }, 30000);
}

async function captureWebpageWithExtension() {
  const extensionPath = path.join(__dirname, 'chrome-extension');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: [
      `--load-extension=${extensionPath}`,
      '--disable-extensions-except=' + extensionPath,
      '--disable-web-security',
      '--user-data-dir=/tmp/chrome-direct-transmission'
    ]
  });

  const page = await browser.newPage();
  
  try {
    // Capture from a different site each time for variety
    const sites = [
      'https://stripe.com/docs',
      'https://vercel.com',
      'https://github.com/features',
      'https://www.shopify.com',
      'https://tailwindcss.com'
    ];
    
    const targetSite = sites[Math.floor(Math.random() * sites.length)];
    console.log(`🌐 Capturing: ${targetSite}`);
    
    await page.goto(targetSite, { 
      waitUntil: 'networkidle2',
      timeout: 15000 
    });
    
    // Wait for extension initialization
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Perform DOM extraction
    const result = await performDOMExtraction(page);
    await browser.close();
    
    return result;
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function performDOMExtraction(page) {
  const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
  const scriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
  
  // Inject and set up extraction
  await page.evaluate((script) => {
    eval(script);
    window.addEventListener('message', (event) => {
      if (event.data.type === 'EXTRACTION_COMPLETE') {
        window.extractionResult = event.data.data;
      } else if (event.data.type === 'EXTRACTION_ERROR') {
        window.extractionError = event.data.error;
      }
    });
  }, scriptContent);
  
  // Trigger extraction
  await page.evaluate(() => {
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
  for (let i = 0; i < 25; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await page.evaluate(() => ({
      result: window.extractionResult || null,
      error: window.extractionError || null
    }));
    
    if (result.result) {
      console.log('✅ DOM extraction successful');
      return result.result;
    }
    if (result.error) {
      throw new Error(`Extraction failed: ${result.error}`);
    }
  }
  
  throw new Error('Extraction timeout');
}

async function setupTransmissionServer(data) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      if (req.url === '/figma-data' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(data));
        console.log('📤 Data transmitted to Figma plugin');
      } else if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end('OK');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(8766, () => {
      console.log('🌐 Transmission server ready on http://localhost:8766');
      resolve(server);
    });
  });
}

async function autoExecuteFigmaPlugin(data) {
  // Launch a browser to interact with Figma plugin
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    
    // Create a simple HTML page that will send data to Figma
    const automationHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Figma Auto-Transmission</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #1a1a1a; 
            color: white;
          }
          .status { 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 5px;
            background: #333;
          }
          .success { background: #0f5132; }
          .error { background: #721c24; }
          .loading { background: #664d03; }
          button {
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px 5px;
          }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>🚀 Automatic Figma Transmission</h1>
        <div id="status" class="status">Ready to transmit data to Figma plugin...</div>
        
        <div>
          <button onclick="transmitToFigma()">🔄 Transmit to Figma Plugin</button>
          <button onclick="openFigmaInstructions()">📖 Manual Instructions</button>
        </div>
        
        <div id="instructions" style="display:none; margin-top: 20px; padding: 15px; background: #333; border-radius: 5px;">
          <h3>Manual Transmission Instructions:</h3>
          <ol>
            <li>Make sure your Figma plugin is open</li>
            <li>Open browser console (F12) in the Figma plugin UI</li>
            <li>Copy and paste this code:</li>
          </ol>
          <pre style="background: #222; padding: 10px; border-radius: 3px; overflow-x: auto;">
fetch('http://localhost:8766/figma-data')
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
          </pre>
        </div>
        
        <script>
          let transmissionData = null;
          
          async function loadData() {
            try {
              const response = await fetch('http://localhost:8766/figma-data');
              transmissionData = await response.json();
              updateStatus('✅ Data loaded successfully: ' + transmissionData.metadata.title, 'success');
              return true;
            } catch (error) {
              updateStatus('❌ Failed to load data: ' + error.message, 'error');
              return false;
            }
          }
          
          async function transmitToFigma() {
            updateStatus('🔄 Attempting transmission to Figma plugin...', 'loading');
            
            if (!transmissionData) {
              const loaded = await loadData();
              if (!loaded) return;
            }
            
            try {
              // Method 1: Try window messaging (if in same context)
              if (window.parent !== window) {
                window.parent.postMessage({
                  pluginMessage: {
                    type: 'external-data',
                    data: transmissionData
                  }
                }, '*');
                updateStatus('✅ Data sent via window messaging', 'success');
                return;
              }
              
              // Method 2: Copy to clipboard for manual paste
              await navigator.clipboard.writeText(JSON.stringify(transmissionData));
              updateStatus('📋 Data copied to clipboard - switch to Figma and paste!', 'success');
              
              // Method 3: Show manual instructions
              setTimeout(() => {
                document.getElementById('instructions').style.display = 'block';
              }, 2000);
              
            } catch (error) {
              updateStatus('❌ Transmission failed: ' + error.message, 'error');
              document.getElementById('instructions').style.display = 'block';
            }
          }
          
          function openFigmaInstructions() {
            document.getElementById('instructions').style.display = 
              document.getElementById('instructions').style.display === 'none' ? 'block' : 'none';
          }
          
          function updateStatus(message, type) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.className = 'status ' + type;
          }
          
          // Auto-load data on page load
          window.addEventListener('load', loadData);
          
          // Auto-transmit after 3 seconds
          setTimeout(() => {
            transmitToFigma();
          }, 3000);
        </script>
      </body>
      </html>
    `;
    
    // Set page content
    await page.setContent(automationHTML);
    
    console.log('🎯 Automation page loaded - data will transmit automatically');
    console.log('📱 Manual transmission also available via the button');
    
    // Keep the automation page open
    await new Promise(resolve => setTimeout(resolve, 25000));
    await browser.close();
    
  } catch (error) {
    await browser.close();
    throw error;
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

// Execute direct transmission
directFigmaTransmission().catch(error => {
  console.error('❌ Direct transmission failed:', error.message);
  console.log('\n💡 Fallback: Use the manual methods available');
});