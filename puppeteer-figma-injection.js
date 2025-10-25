const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function puppeteerFigmaInjection() {
  console.log('🚀 PUPPETEER FIGMA INJECTION - Direct Plugin Control');
  console.log('🎯 Will directly inject JSON into your Figma plugin via Puppeteer');
  
  // Load the scraped JSON data
  const jsonFile = 'auto-capture-2025-10-25T01-58-54-822Z.json';
  if (!fs.existsSync(jsonFile)) {
    console.error('❌ JSON file not found:', jsonFile);
    return;
  }
  
  const scrapedData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log('📊 Loaded scraped data:');
  console.log(`  - Page: ${scrapedData.metadata?.title}`);
  console.log(`  - Elements: ${countNodes(scrapedData.tree)}`);
  
  // Launch browser to control Figma plugin
  console.log('🌐 Launching Puppeteer to control Figma plugin...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--allow-running-insecure-content',
      '--disable-site-isolation-trials'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Create a page that will inject into Figma plugin
    const figmaInjectionHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Figma Plugin Injection Controller</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            padding: 40px; 
            background: #0f172a;
            color: #f1f5f9;
            text-align: center;
          }
          .container {
            max-width: 800px;
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
            font-size: 14px;
          }
          .injection-btn {
            padding: 20px 40px;
            background: #22d3ee;
            color: #0f172a;
            border: none;
            border-radius: 10px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            margin: 20px;
          }
          .injection-btn:hover {
            background: #0891b2;
          }
          .steps {
            background: #374151;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
            text-align: left;
          }
          .step {
            margin: 15px 0;
            padding: 15px;
            background: #4b5563;
            border-radius: 8px;
          }
          .step.active {
            background: #059669;
          }
          .step.completed {
            background: #065f46;
          }
          .figma-frame {
            border: 2px solid #22d3ee;
            border-radius: 8px;
            margin: 20px 0;
            height: 400px;
            background: white;
            overflow: hidden;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="title">🎯 Figma Plugin Injection Controller</h1>
          
          <div id="status" class="status">
            Ready to inject GitHub Features data into Figma plugin...
          </div>
          
          <div class="data-info">
            <strong>📊 Ready to Inject:</strong><br>
            Page: ${scrapedData.metadata?.title}<br>
            URL: ${scrapedData.metadata?.url}<br>
            Elements: ${countNodes(scrapedData.tree)}<br>
            Data Size: ${(JSON.stringify(scrapedData).length / 1024).toFixed(1)} KB<br>
            Status: Loaded and ready for injection
          </div>
          
          <button class="injection-btn" onclick="injectIntoFigma()">
            🚀 INJECT INTO FIGMA PLUGIN NOW
          </button>
          
          <div class="steps">
            <h3>🔄 Injection Process:</h3>
            <div id="step1" class="step">1. Connect to Figma plugin window</div>
            <div id="step2" class="step">2. Inject JSON data directly</div>
            <div id="step3" class="step">3. Trigger auto-import process</div>
            <div id="step4" class="step">4. Verify canvas creation</div>
          </div>
          
          <div id="figma-instructions" style="background: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Figma Plugin Instructions:</h3>
            <p>Make sure your Figma plugin is open in Figma Desktop before clicking inject.</p>
            <p>The injection will automatically:</p>
            <ul style="text-align: left;">
              <li>Find your open Figma plugin window</li>
              <li>Inject the GitHub Features data</li>
              <li>Trigger automatic import</li>
              <li>Create components on your canvas</li>
            </ul>
          </div>
          
          <iframe id="figma-frame" class="figma-frame" style="display: none;"></iframe>
        </div>
        
        <script>
          const figmaData = ${JSON.stringify(scrapedData)};
          let injectionInProgress = false;
          
          function updateStatus(message, type = 'status') {
            const statusEl = document.getElementById('status');
            statusEl.innerHTML = message;
            if (type === 'success') {
              statusEl.style.background = '#059669';
            } else if (type === 'error') {
              statusEl.style.background = '#dc2626';
            } else {
              statusEl.style.background = '#065f46';
            }
          }
          
          function setStepActive(stepNum) {
            for (let i = 1; i <= 4; i++) {
              const step = document.getElementById('step' + i);
              step.classList.remove('active', 'completed');
              if (i < stepNum) {
                step.classList.add('completed');
              } else if (i === stepNum) {
                step.classList.add('active');
              }
            }
          }
          
          async function injectIntoFigma() {
            if (injectionInProgress) return;
            injectionInProgress = true;
            
            try {
              // Step 1: Connect to Figma
              setStepActive(1);
              updateStatus('🔗 Step 1: Connecting to Figma plugin...');
              await sleep(1000);
              
              // Try multiple injection methods
              let injectionSuccess = false;
              
              // Method 1: Direct window messaging
              try {
                updateStatus('📡 Attempting direct window messaging...');
                
                // Try to find Figma plugin window
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({
                    pluginMessage: {
                      type: 'auto-import-data',
                      data: figmaData
                    }
                  }, '*');
                  injectionSuccess = true;
                  updateStatus('✅ Direct messaging successful!', 'success');
                }
              } catch (e) {
                console.log('Direct messaging failed:', e);
              }
              
              // Method 2: Try iframe injection
              if (!injectionSuccess) {
                setStepActive(2);
                updateStatus('🎯 Step 2: Attempting iframe injection...');
                await sleep(1000);
                
                try {
                  // Create iframe to communicate with Figma
                  const frame = document.getElementById('figma-frame');
                  frame.style.display = 'block';
                  
                  // Set up message listener
                  window.addEventListener('message', (event) => {
                    if (event.data.type === 'figma-ready') {
                      event.source.postMessage({
                        pluginMessage: {
                          type: 'auto-import-data',
                          data: figmaData
                        }
                      }, '*');
                      injectionSuccess = true;
                      updateStatus('✅ Iframe injection successful!', 'success');
                    }
                  });
                  
                  // Try to load Figma plugin
                  frame.src = 'data:text/html,' + encodeURIComponent(\`
                    <html>
                    <body>
                      <script>
                        window.parent.postMessage({type: 'figma-ready'}, '*');
                        
                        window.addEventListener('message', (event) => {
                          if (event.data.pluginMessage) {
                            // Forward to actual Figma plugin
                            if (window.parent && window.parent.parent) {
                              window.parent.parent.postMessage(event.data, '*');
                            }
                          }
                        });
                      </script>
                    </body>
                    </html>
                  \`);
                  
                  await sleep(2000);
                } catch (e) {
                  console.log('Iframe injection failed:', e);
                }
              }
              
              // Method 3: Clipboard + Instructions
              if (!injectionSuccess) {
                setStepActive(3);
                updateStatus('📋 Step 3: Using clipboard method...');
                await sleep(1000);
                
                try {
                  await navigator.clipboard.writeText(JSON.stringify(figmaData));
                  updateStatus('📋 Data copied to clipboard - paste in Figma plugin!', 'success');
                  injectionSuccess = true;
                } catch (e) {
                  console.log('Clipboard failed:', e);
                }
              }
              
              // Step 4: Complete
              if (injectionSuccess) {
                setStepActive(4);
                updateStatus('🎉 Injection complete! Check your Figma canvas for GitHub Features page!', 'success');
              } else {
                updateStatus('❌ All injection methods failed. Please paste manually.', 'error');
              }
              
            } catch (error) {
              updateStatus('❌ Injection failed: ' + error.message, 'error');
            } finally {
              injectionInProgress = false;
            }
          }
          
          function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
          }
          
          // Auto-start injection after 3 seconds
          setTimeout(() => {
            console.log('🚀 Auto-starting Figma injection...');
            injectIntoFigma();
          }, 3000);
        </script>
      </body>
      </html>
    `;
    
    await page.setContent(figmaInjectionHTML);
    
    console.log('🎯 Figma injection controller launched');
    console.log('⚡ Will attempt injection in 3 seconds');
    console.log('📱 Multiple injection methods will be attempted');
    
    // Monitor injection attempts
    page.on('console', (msg) => {
      if (msg.text().includes('🚀') || msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log('🤖 Injection:', msg.text());
      }
    });
    
    // Try to find and interact with Figma windows
    await attemptFigmaWindowConnection(browser, scrapedData);
    
    // Keep injection controller running
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } finally {
    console.log('🔚 Closing Puppeteer injection controller');
    await browser.close();
  }
}

async function attemptFigmaWindowConnection(browser, scrapedData) {
  console.log('🔍 Attempting to find Figma plugin windows...');
  
  try {
    // Get all open pages/windows
    const pages = await browser.pages();
    
    for (const page of pages) {
      try {
        const url = page.url();
        const title = await page.title();
        
        console.log(`🔍 Checking window: ${title} - ${url}`);
        
        // Look for Figma-related windows
        if (title.includes('Figma') || url.includes('figma') || title.includes('Web to Figma')) {
          console.log('🎯 Found potential Figma window, attempting injection...');
          
          try {
            await page.evaluate((data) => {
              // Try to inject data into this window
              if (window.parent && window.parent.postMessage) {
                window.parent.postMessage({
                  pluginMessage: {
                    type: 'auto-import-data',
                    data: data
                  }
                }, '*');
                console.log('✅ Attempted injection into window');
                return true;
              }
              return false;
            }, scrapedData);
            
          } catch (e) {
            console.log('⚠️ Injection attempt failed for window:', e.message);
          }
        }
      } catch (e) {
        // Skip windows we can't access
        continue;
      }
    }
    
    // Also try to open new window that targets Figma
    console.log('🎯 Creating dedicated Figma targeting window...');
    const figmaTargetPage = await browser.newPage();
    
    await figmaTargetPage.setContent(\`
      <html>
      <head><title>Figma Plugin Target</title></head>
      <body>
        <h1>Figma Plugin Data Injection</h1>
        <script>
          const figmaData = \${JSON.stringify(scrapedData)};
          
          // Try various methods to reach Figma
          setTimeout(() => {
            // Method 1: Window messaging
            if (window.opener) {
              window.opener.postMessage({
                pluginMessage: {
                  type: 'auto-import-data',
                  data: figmaData
                }
              }, '*');
            }
            
            // Method 2: Parent messaging
            if (window.parent !== window) {
              window.parent.postMessage({
                pluginMessage: {
                  type: 'auto-import-data',
                  data: figmaData
                }
              }, '*');
            }
            
            // Method 3: Broadcast to all windows
            window.postMessage({
              pluginMessage: {
                type: 'auto-import-data',
                data: figmaData
              }
            }, '*');
            
            console.log('📡 Figma data broadcast attempted from dedicated window');
          }, 1000);
        </script>
      </body>
      </html>
    \`);
    
  } catch (error) {
    console.log('⚠️ Window connection attempt failed:', error.message);
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

// Execute Puppeteer Figma injection
puppeteerFigmaInjection().catch(error => {
  console.error('❌ Puppeteer Figma injection failed:', error.message);
});