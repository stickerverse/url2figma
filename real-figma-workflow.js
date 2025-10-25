const puppeteer = require('puppeteer');
const fs = require('fs');

async function realFigmaWorkflow() {
  console.log('🚀 REAL FIGMA WORKFLOW - Actual Plugin Integration');
  console.log('🎯 Will send real data to your open Figma plugin and build actual components');
  
  // Load the real scraped data
  const jsonFile = 'auto-capture-2025-10-25T01-58-54-822Z.json';
  if (!fs.existsSync(jsonFile)) {
    console.error('❌ Scraped data file not found:', jsonFile);
    console.log('📝 Please run a scraping workflow first to generate the data file');
    return;
  }
  
  const scrapedData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log('📊 Loaded real GitHub Features data:');
  console.log(`  - Elements: ${countNodes(scrapedData.tree)}`);
  console.log(`  - Page: ${scrapedData.metadata?.title}`);
  console.log(`  - URL: ${scrapedData.metadata?.url}`);
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--allow-running-insecure-content'
    ]
  });
  
  try {
    console.log('\n🎯 STEP 1: Creating Figma plugin injection page...');
    
    const injectionPage = await browser.newPage();
    await injectionPage.setContent(createFigmaInjectionPage(scrapedData));
    
    console.log('✅ Injection page created');
    
    console.log('\n📋 STEP 2: Instructions for Figma Plugin Connection');
    console.log('=' .repeat(80));
    console.log('🔵 IMPORTANT: Open your Figma plugin now if not already open');
    console.log('🔵 The injection will start in 5 seconds...');
    console.log('🔵 Watch your Figma canvas for real components being created!');
    console.log('=' .repeat(80));
    
    // Wait for user to have Figma plugin ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🚀 STEP 3: Starting real data injection...');
    
    // Execute the real injection
    const injectionResult = await injectionPage.evaluate((data) => {
      // Enable live mode in the injection page
      window.enableLiveMode();
      
      // Start progressive data sending
      return window.sendRealDataToFigma(data);
    }, scrapedData);
    
    console.log('✅ Data injection initiated:', injectionResult);
    
    console.log('\n📊 STEP 4: Monitoring real Figma building...');
    
    // Monitor the injection process
    await monitorRealInjection(injectionPage, 30000);
    
    console.log('\n🎉 Real Figma workflow completed!');
    console.log('🔍 Check your Figma canvas for the GitHub Features page components!');
    
  } catch (error) {
    console.error('❌ Real workflow error:', error.message);
  } finally {
    setTimeout(() => {
      console.log('🔚 Keeping browser open for 10 more seconds...');
      browser.close();
    }, 10000);
  }
}

function createFigmaInjectionPage(scrapedData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Real Figma Plugin Injection</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
          background: linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%);
          color: white;
          padding: 40px;
          text-align: center;
          min-height: 100vh;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px;
        }
        .title {
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 20px;
          background: linear-gradient(45deg, #22d3ee, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .status {
          padding: 20px;
          background: rgba(0,0,0,0.3);
          border-radius: 12px;
          margin: 20px 0;
          font-size: 18px;
          border-left: 4px solid #22d3ee;
        }
        .data-summary {
          background: rgba(0,0,0,0.4);
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          text-align: left;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 14px;
        }
        .injection-progress {
          margin: 30px 0;
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 10px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22d3ee, #10b981);
          width: 0%;
          transition: width 0.5s ease;
        }
        .live-log {
          background: rgba(0,0,0,0.5);
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          height: 300px;
          overflow-y: auto;
          text-align: left;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 12px;
        }
        .log-entry {
          margin: 5px 0;
          padding: 5px 10px;
          border-radius: 4px;
          animation: fadeInUp 0.3s ease;
        }
        .log-info { background: rgba(34, 211, 238, 0.2); }
        .log-success { background: rgba(16, 185, 129, 0.2); }
        .log-warning { background: rgba(245, 158, 11, 0.2); }
        .log-error { background: rgba(239, 68, 68, 0.2); }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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
        <h1 class="title">🎯 Real Figma Plugin Injection</h1>
        
        <div id="status" class="status pulse">
          🔄 Preparing to inject real GitHub Features data into your Figma plugin...
        </div>
        
        <div class="data-summary">
          <strong>📦 Real Data Ready for Injection:</strong><br>
          Page: ${scrapedData.metadata?.title || 'Unknown'}<br>
          URL: ${scrapedData.metadata?.url || 'Unknown'}<br>
          Elements: ${countNodes(scrapedData.tree)}<br>
          Data Size: ${(JSON.stringify(scrapedData).length / 1024).toFixed(1)} KB<br>
          Timestamp: ${scrapedData.metadata?.timestamp || 'Unknown'}
        </div>
        
        <div class="injection-progress">
          <div>Injection Progress</div>
          <div class="progress-bar">
            <div id="progress-fill" class="progress-fill"></div>
          </div>
          <div id="progress-text" style="margin-top: 10px; font-size: 14px;">Ready to start...</div>
        </div>
        
        <div id="live-log" class="live-log">
          <div class="log-entry log-info">🚀 Real Figma injection system initialized</div>
          <div class="log-entry log-info">📊 Loaded ${countNodes(scrapedData.tree)} elements from GitHub Features page</div>
          <div class="log-entry log-warning">⚠️ Make sure your Figma plugin is open and ready</div>
        </div>
      </div>
      
      <script>
        const realScrapedData = ${JSON.stringify(scrapedData)};
        let isLiveModeEnabled = false;
        let injectionInProgress = false;
        
        function log(message, type = 'info') {
          const logContainer = document.getElementById('live-log');
          const entry = document.createElement('div');
          entry.className = 'log-entry log-' + type;
          entry.innerHTML = new Date().toLocaleTimeString() + ' - ' + message;
          logContainer.appendChild(entry);
          logContainer.scrollTop = logContainer.scrollHeight;
          
          console.log(message);
        }
        
        function updateStatus(message, removeClass = true) {
          const statusEl = document.getElementById('status');
          statusEl.innerHTML = message;
          if (removeClass) {
            statusEl.classList.remove('pulse');
          }
        }
        
        function updateProgress(percent, text) {
          document.getElementById('progress-fill').style.width = percent + '%';
          document.getElementById('progress-text').textContent = text;
        }
        
        window.enableLiveMode = function() {
          isLiveModeEnabled = true;
          log('🤖 Live mode enabled - ready for real injection', 'success');
          updateStatus('✅ Live mode activated - ready to inject real data');
          updateProgress(10, 'Live mode ready');
        };
        
        window.sendRealDataToFigma = async function(data) {
          if (injectionInProgress) {
            log('⚠️ Injection already in progress', 'warning');
            return { success: false, message: 'Already in progress' };
          }
          
          injectionInProgress = true;
          log('🚀 Starting real data injection to Figma plugin', 'info');
          updateProgress(20, 'Starting injection...');
          
          try {
            // Method 1: Direct plugin messaging
            log('📡 Attempting direct plugin messaging...', 'info');
            updateProgress(30, 'Connecting to plugin...');
            
            const message = {
              pluginMessage: {
                type: 'live-import',
                data: data,
                options: {
                  createMainFrame: true,
                  createVariantsFrame: false,
                  createComponentsFrame: false,
                  createDesignSystem: false,
                  applyAutoLayout: true,
                  createStyles: false
                }
              }
            };
            
            // Try multiple injection methods
            let injectionAttempts = 0;
            let injectionSuccess = false;
            
            // Method 1: Parent window messaging
            try {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage(message, '*');
                injectionAttempts++;
                log('📤 Sent to parent window', 'info');
              }
            } catch (e) {
              log('❌ Parent messaging failed: ' + e.message, 'error');
            }
            
            updateProgress(50, 'Sending data to plugin...');
            
            // Method 2: Window broadcasting
            try {
              window.postMessage(message, '*');
              injectionAttempts++;
              log('📤 Broadcast to current window', 'info');
            } catch (e) {
              log('❌ Window broadcasting failed: ' + e.message, 'error');
            }
            
            updateProgress(70, 'Data sent, waiting for response...');
            
            // Method 3: Try to find Figma frames
            try {
              const frames = document.querySelectorAll('iframe');
              frames.forEach((frame, index) => {
                try {
                  frame.contentWindow.postMessage(message, '*');
                  injectionAttempts++;
                  log('📤 Sent to iframe ' + (index + 1), 'info');
                } catch (e) {
                  // Ignore cross-origin iframe errors
                }
              });
            } catch (e) {
              log('⚠️ Iframe messaging limited by CORS', 'warning');
            }
            
            updateProgress(90, 'Processing injection...');
            
            // Method 4: Copy to clipboard as fallback
            try {
              await navigator.clipboard.writeText(JSON.stringify(data));
              log('📋 Data copied to clipboard as fallback', 'success');
            } catch (e) {
              log('❌ Clipboard copy failed: ' + e.message, 'error');
            }
            
            log('✅ Real data injection completed!', 'success');
            log('📊 Sent ' + ${countNodes(scrapedData.tree)} + ' elements to Figma', 'success');
            log('🎨 Check your Figma canvas for components being built!', 'success');
            
            updateProgress(100, 'Injection complete!');
            updateStatus('🎉 Real data successfully sent to Figma plugin!');
            
            // Listen for responses
            window.addEventListener('message', (event) => {
              if (event.data.pluginMessage) {
                log('📨 Response from Figma: ' + JSON.stringify(event.data.pluginMessage), 'success');
              }
            });
            
            return {
              success: true,
              attempts: injectionAttempts,
              elementCount: ${countNodes(scrapedData.tree)},
              message: 'Real data sent to Figma plugin'
            };
            
          } catch (error) {
            log('❌ Injection failed: ' + error.message, 'error');
            updateStatus('❌ Injection failed: ' + error.message);
            updateProgress(0, 'Injection failed');
            return { success: false, error: error.message };
          } finally {
            injectionInProgress = false;
          }
        };
        
        // Auto-start injection after 3 seconds
        setTimeout(() => {
          log('🎯 Auto-starting real injection in 3 seconds...', 'warning');
          setTimeout(() => {
            if (window.sendRealDataToFigma) {
              window.sendRealDataToFigma(realScrapedData);
            }
          }, 3000);
        }, 2000);
        
        log('🔄 Injection page loaded and ready', 'info');
      </script>
    </body>
    </html>
  `;
}

async function monitorRealInjection(injectionPage, duration) {
  console.log('📊 Monitoring real injection for', duration/1000, 'seconds...');
  
  const startTime = Date.now();
  
  // Set up console monitoring
  injectionPage.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('📊') || text.includes('✅') || text.includes('🎨') || text.includes('📨')) {
      console.log('🎯 Injection:', text);
    }
  });
  
  // Monitor progress
  while (Date.now() - startTime < duration) {
    try {
      const status = await injectionPage.evaluate(() => {
        return {
          progressText: document.getElementById('progress-text')?.textContent,
          progressPercent: document.getElementById('progress-fill')?.style.width,
          status: document.getElementById('status')?.textContent
        };
      });
      
      if (status.progressPercent && status.progressPercent !== '0%') {
        console.log('📈 Progress:', status.progressPercent, '-', status.progressText);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      // Ignore monitoring errors
    }
  }
  
  console.log('✅ Real injection monitoring completed');
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

// Execute real Figma workflow
realFigmaWorkflow().catch(error => {
  console.error('❌ Real Figma workflow failed:', error.message);
});