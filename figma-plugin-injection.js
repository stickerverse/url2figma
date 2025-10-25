const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function injectDataIntoFigmaPlugin() {
  console.log('🚀 Starting Figma Plugin Data Injection...');
  
  // Read the latest captured data
  const dataFiles = [
    'transmission-data.json',
    'figma-ready-data.json', 
    'test-extraction-result.json'
  ];
  
  let capturedData = null;
  for (const file of dataFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      capturedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log(`📂 Using data from: ${file}`);
      break;
    }
  }
  
  if (!capturedData) {
    console.log('📦 No existing data found, capturing fresh data...');
    capturedData = await captureFreshData();
  }
  
  console.log(`📊 Data ready: ${countNodes(capturedData.tree)} elements from ${capturedData.metadata?.title}`);
  
  // Launch browser to simulate Figma plugin environment
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  try {
    const page = await browser.newPage();
    
    // Create a Figma plugin simulation environment
    const figmaPluginSimulation = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Figma Plugin Simulation</title>
        <style>
          body { 
            font-family: 'Inter', Arial, sans-serif; 
            padding: 20px; 
            background: #f5f5f5; 
            margin: 0;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 20px;
          }
          .status { 
            padding: 12px; 
            margin: 10px 0; 
            border-radius: 6px;
            font-size: 14px;
          }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          .loading { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .info { background: #e2f3ff; color: #0c5460; border: 1px solid #bee5eb; }
          
          button {
            width: 100%;
            padding: 12px;
            background: #18a0fb;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin: 8px 0;
            font-size: 14px;
            font-weight: 500;
          }
          button:hover { background: #0d8ce8; }
          button:disabled { background: #ccc; cursor: not-allowed; }
          
          .options {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
          }
          
          .checkbox-group {
            margin: 8px 0;
          }
          
          .checkbox-group label {
            display: flex;
            align-items: center;
            font-size: 13px;
            color: #333;
          }
          
          .checkbox-group input[type="checkbox"] {
            margin-right: 8px;
          }
          
          .progress-bar {
            width: 100%;
            height: 4px;
            background: #e9ecef;
            border-radius: 2px;
            overflow: hidden;
            margin: 10px 0;
          }
          
          .progress-fill {
            height: 100%;
            background: #18a0fb;
            width: 0%;
            transition: width 0.3s ease;
          }
          
          .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 15px 0;
          }
          
          .stat-item {
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            text-align: center;
          }
          
          .stat-number {
            font-size: 20px;
            font-weight: bold;
            color: #18a0fb;
          }
          
          .stat-label {
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="margin-top: 0; color: #333;">HTML to Figma Converter</h2>
          
          <div id="status" class="status info">Ready to import webpage data...</div>
          
          <div class="progress-bar">
            <div id="progress-fill" class="progress-fill"></div>
          </div>
          
          <div class="stats" id="stats" style="display: none;">
            <div class="stat-item">
              <div id="stat-elements" class="stat-number">0</div>
              <div class="stat-label">Elements</div>
            </div>
            <div class="stat-item">
              <div id="stat-frames" class="stat-number">0</div>
              <div class="stat-label">Frames</div>
            </div>
          </div>
          
          <div class="options">
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="opt-main-frame" checked> Create main frame
              </label>
            </div>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="opt-auto-layout" checked> Apply Auto Layout
              </label>
            </div>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="opt-components-frame"> Create components frame
              </label>
            </div>
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="opt-design-system"> Generate design system
              </label>
            </div>
          </div>
          
          <button id="inject-btn" onclick="injectDataAndImport()">
            🚀 Inject Data & Auto-Import
          </button>
          
          <button onclick="simulateManualImport()" style="background: #6c757d;">
            🎭 Simulate Manual Import
          </button>
        </div>
        
        <script>
          const capturedData = ${JSON.stringify(capturedData)};
          let importing = false;
          
          function updateStatus(message, type = 'info') {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.className = 'status ' + type;
          }
          
          function updateProgress(percent) {
            document.getElementById('progress-fill').style.width = percent + '%';
          }
          
          function showStats(elementCount, frameCount) {
            document.getElementById('stat-elements').textContent = elementCount;
            document.getElementById('stat-frames').textContent = frameCount;
            document.getElementById('stats').style.display = 'grid';
          }
          
          async function injectDataAndImport() {
            if (importing) return;
            importing = true;
            
            const btn = document.getElementById('inject-btn');
            btn.disabled = true;
            btn.textContent = '🔄 Injecting & Importing...';
            
            try {
              updateStatus('📡 Injecting data into Figma plugin...', 'loading');
              updateProgress(10);
              
              // Simulate data injection
              await new Promise(resolve => setTimeout(resolve, 1000));
              updateProgress(30);
              
              updateStatus('🎨 Creating Figma nodes...', 'loading');
              await new Promise(resolve => setTimeout(resolve, 1500));
              updateProgress(60);
              
              updateStatus('🔧 Applying Auto Layout...', 'loading');
              await new Promise(resolve => setTimeout(resolve, 1000));
              updateProgress(80);
              
              updateStatus('✨ Finalizing import...', 'loading');
              await new Promise(resolve => setTimeout(resolve, 800));
              updateProgress(100);
              
              // Show final results
              const elementCount = countNodes(capturedData.tree);
              const frameCount = countFrameNodes(capturedData.tree);
              
              updateStatus(\`✅ Successfully imported \${elementCount} elements!\`, 'success');
              showStats(elementCount, frameCount);
              
              btn.textContent = '✅ Import Complete!';
              
              // Reset after 3 seconds
              setTimeout(() => {
                btn.disabled = false;
                btn.textContent = '🚀 Inject Data & Auto-Import';
                importing = false;
                updateProgress(0);
              }, 3000);
              
            } catch (error) {
              updateStatus('❌ Import failed: ' + error.message, 'error');
              btn.disabled = false;
              btn.textContent = '🚀 Inject Data & Auto-Import';
              importing = false;
            }
          }
          
          async function simulateManualImport() {
            updateStatus('📋 Data copied to clipboard for manual import', 'info');
            
            try {
              await navigator.clipboard.writeText(JSON.stringify(capturedData));
              updateStatus('📋 ✅ Data in clipboard - paste in real Figma plugin!', 'success');
            } catch (error) {
              updateStatus('📋 ⚠️ Manual copy required - data ready for export', 'info');
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
          
          function countFrameNodes(node) {
            let count = node.type === 'FRAME' ? 1 : 0;
            if (node.children) {
              for (const child of node.children) {
                count += countFrameNodes(child);
              }
            }
            return count;
          }
          
          // Initialize
          window.addEventListener('load', () => {
            const elementCount = countNodes(capturedData.tree);
            updateStatus(\`📦 Loaded data: \${elementCount} elements from \${capturedData.metadata?.title}\`, 'info');
            
            console.log('🎯 Figma Plugin Simulation Ready');
            console.log('📊 Data:', capturedData);
            console.log('🔥 Ready for automatic import!');
          });
        </script>
      </body>
      </html>
    `;
    
    await page.setContent(figmaPluginSimulation);
    
    console.log('🎨 Figma Plugin Simulation loaded');
    console.log('🎯 Click "Inject Data & Auto-Import" to simulate the complete workflow');
    console.log('📱 The simulation will show how data flows from capture to Figma');
    
    // Keep the simulation running
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
    
  } finally {
    await browser.close();
  }
}

async function captureFreshData() {
  console.log('📦 Capturing fresh webpage data...');
  
  const extensionPath = path.join(__dirname, 'chrome-extension');
  const browser = await puppeteer.launch({
    headless: false,
    args: [`--load-extension=${extensionPath}`, '--disable-extensions-except=' + extensionPath]
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Quick extraction
    const injectedScriptPath = path.join(__dirname, 'chrome-extension', 'dist', 'injected-script.js');
    const scriptContent = fs.readFileSync(injectedScriptPath, 'utf8');
    
    await page.evaluate((script) => {
      eval(script);
      window.addEventListener('message', (event) => {
        if (event.data.type === 'EXTRACTION_COMPLETE') {
          window.extractionResult = event.data.data;
        }
      });
    }, scriptContent);
    
    await page.evaluate(() => {
      window.postMessage({ type: 'START_EXTRACTION', screenshot: '' }, '*');
    });
    
    // Wait for result
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await page.evaluate(() => window.extractionResult);
      if (result) {
        console.log('✅ Fresh data captured');
        return result;
      }
    }
    
    throw new Error('Fresh capture timeout');
    
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

// Execute injection
injectDataIntoFigmaPlugin().catch(error => {
  console.error('❌ Injection failed:', error.message);
});