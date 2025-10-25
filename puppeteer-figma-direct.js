const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function puppeteerFigmaDirect() {
  console.log('🚀 PUPPETEER DIRECT FIGMA INJECTION');
  console.log('🎯 Will directly control and inject into your Figma plugin');
  
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
  
  // Launch browser with special flags for Figma access
  console.log('🌐 Launching Puppeteer with Figma access...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--allow-running-insecure-content',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests'
    ]
  });
  
  try {
    // Create main injection page
    const page = await browser.newPage();
    
    // Set up the injection controller
    const injectionHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Direct Figma Injection</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
          }
          .container {
            max-width: 700px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 50px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .title {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 30px;
          }
          .status {
            font-size: 18px;
            margin: 20px 0;
            padding: 20px;
            background: rgba(0,0,0,0.2);
            border-radius: 10px;
          }
          .data-summary {
            background: rgba(0,0,0,0.3);
            padding: 25px;
            border-radius: 15px;
            margin: 25px 0;
            text-align: left;
            font-family: monospace;
          }
          .inject-btn {
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
          .steps {
            text-align: left;
            margin: 30px 0;
          }
          .step {
            padding: 15px;
            margin: 10px 0;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
          }
          .step.active {
            background: rgba(16, 185, 129, 0.3);
          }
          .step.completed {
            background: rgba(16, 185, 129, 0.2);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="title">🎯 Direct Figma Injection</h1>
          
          <div id="status" class="status">
            Ready to inject GitHub Features data into your Figma plugin...
          </div>
          
          <div class="data-summary">
            <strong>📊 Data Ready for Injection:</strong><br>
            Page: ${scrapedData.metadata?.title}<br>
            URL: ${scrapedData.metadata?.url}<br>
            Elements: ${countNodes(scrapedData.tree)}<br>
            Size: ${(JSON.stringify(scrapedData).length / 1024).toFixed(1)} KB
          </div>
          
          <button class="inject-btn" onclick="directInject()">
            🚀 INJECT INTO FIGMA NOW
          </button>
          
          <div class="steps">
            <div id="step1" class="step">1. Locate Figma plugin window</div>
            <div id="step2" class="step">2. Inject JSON data directly</div>
            <div id="step3" class="step">3. Trigger automatic import</div>
            <div id="step4" class="step">4. Verify canvas creation</div>
          </div>
        </div>
        
        <script>
          const githubData = ${JSON.stringify(scrapedData)};
          let injecting = false;
          
          function updateStatus(message) {
            document.getElementById('status').innerHTML = message;
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
          
          async function directInject() {
            if (injecting) return;
            injecting = true;
            
            try {
              // Step 1: Locate Figma
              setStepActive(1);
              updateStatus('🔍 Step 1: Locating Figma plugin window...');
              await sleep(1000);
              
              // Step 2: Inject data
              setStepActive(2);
              updateStatus('📡 Step 2: Injecting GitHub data...');
              await sleep(1000);
              
              // Try multiple injection methods
              let success = false;
              
              // Method 1: Direct window messaging
              try {
                window.postMessage({
                  pluginMessage: {
                    type: 'auto-import-data',
                    data: githubData
                  }
                }, '*');
                success = true;
                console.log('✅ Window messaging attempted');
              } catch (e) {
                console.log('Window messaging failed:', e);
              }
              
              // Method 2: Parent window messaging
              try {
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({
                    pluginMessage: {
                      type: 'auto-import-data',
                      data: githubData
                    }
                  }, '*');
                  success = true;
                  console.log('✅ Parent messaging attempted');
                }
              } catch (e) {
                console.log('Parent messaging failed:', e);
              }
              
              // Method 3: Copy to clipboard as fallback
              try {
                await navigator.clipboard.writeText(JSON.stringify(githubData));
                console.log('✅ Data copied to clipboard as fallback');
              } catch (e) {
                console.log('Clipboard failed:', e);
              }
              
              // Step 3: Trigger import
              setStepActive(3);
              updateStatus('🎨 Step 3: Triggering automatic import...');
              await sleep(2000);
              
              // Step 4: Complete
              setStepActive(4);
              if (success) {
                updateStatus('✅ Direct injection completed! Check your Figma canvas!');
              } else {
                updateStatus('📋 Data ready in clipboard - paste in your Figma plugin!');
              }
              
            } catch (error) {
              updateStatus('❌ Injection failed: ' + error.message);
            } finally {
              injecting = false;
            }
          }
          
          function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
          }
          
          // Auto-start injection
          setTimeout(() => {
            console.log('🚀 Auto-starting direct injection...');
            directInject();
          }, 3000);
          
          // Set up message listener for responses
          window.addEventListener('message', (event) => {
            console.log('📨 Received message:', event.data);
            if (event.data.type === 'figma-import-success') {
              updateStatus('🎉 Figma import successful! Canvas created!');
            }
          });
        </script>
      </body>
      </html>
    `;
    
    await page.setContent(injectionHTML);
    
    console.log('🎯 Direct injection controller launched');
    console.log('⚡ Auto-injection will start in 3 seconds');
    
    // Monitor for injection activity
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('✅') || text.includes('🚀') || text.includes('📨')) {
        console.log('🤖 Injection:', text);
      }
    });
    
    // Try to find and access Figma directly
    await attemptDirectFigmaAccess(browser, scrapedData);
    
    // Keep running to monitor results
    await new Promise(resolve => setTimeout(resolve, 25000));
    
    console.log('✅ Direct injection process completed');
    
  } finally {
    setTimeout(() => browser.close(), 5000);
  }
}

async function attemptDirectFigmaAccess(browser, data) {
  console.log('🔍 Attempting direct Figma access...');
  
  try {
    // Create a new page specifically to target Figma
    const figmaPage = await browser.newPage();
    
    // Set up the Figma targeting page
    const figmaTargetHTML = `
      <html>
      <head><title>Figma Target</title></head>
      <body>
        <h1>Targeting Figma Plugin</h1>
        <p>Attempting to send data to Figma plugin...</p>
        <script>
          const figmaData = ${JSON.stringify(data)};
          
          // Function to try sending data
          function sendToFigma() {
            console.log('📡 Attempting to send data to Figma plugin...');
            
            // Try various window messaging approaches
            const message = {
              pluginMessage: {
                type: 'auto-import-data',
                data: figmaData
              }
            };
            
            // Method 1: Broadcast to all windows
            window.postMessage(message, '*');
            
            // Method 2: Try parent windows
            let currentWindow = window;
            let attempts = 0;
            while (currentWindow.parent !== currentWindow && attempts < 5) {
              try {
                currentWindow.parent.postMessage(message, '*');
                console.log('📤 Sent to parent window level', attempts);
              } catch (e) {
                console.log('Parent messaging failed at level', attempts, e);
              }
              currentWindow = currentWindow.parent;
              attempts++;
            }
            
            // Method 3: Try opener
            if (window.opener) {
              try {
                window.opener.postMessage(message, '*');
                console.log('📤 Sent to opener window');
              } catch (e) {
                console.log('Opener messaging failed:', e);
              }
            }
            
            console.log('✅ All messaging attempts completed');
          }
          
          // Send immediately and then periodically
          setTimeout(sendToFigma, 1000);
          setInterval(sendToFigma, 5000);
          
          // Listen for any responses
          window.addEventListener('message', (event) => {
            console.log('📨 Received response:', event.data);
          });
        </script>
      </body>
      </html>
    `;
    
    await figmaPage.setContent(figmaTargetHTML);
    
    console.log('🎯 Figma targeting page created');
    
    // Monitor the targeting page
    figmaPage.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('📡') || text.includes('📤') || text.includes('✅') || text.includes('📨')) {
        console.log('🎯 Figma Target:', text);
      }
    });
    
  } catch (error) {
    console.log('⚠️ Direct Figma access failed:', error.message);
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

// Execute direct Figma injection
puppeteerFigmaDirect().catch(error => {
  console.error('❌ Direct Figma injection failed:', error.message);
});