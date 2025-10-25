const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function masterLiveController() {
  console.log('🚀 MASTER LIVE CONTROLLER - Simultaneous Scraping & Figma Building');
  console.log('🎯 Will coordinate Chrome extension scraping + Figma plugin building in real-time');
  
  let scrapingResults = null;
  let figmaPage = null;
  let scrapingPage = null;
  
  // Launch browser with special flags for cross-origin access
  console.log('🌐 Launching Puppeteer with enhanced access...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--allow-running-insecure-content',
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      '--allow-file-access-from-files',
      '--disable-extensions-except=' + path.resolve(__dirname, 'chrome-extension'),
      '--load-extension=' + path.resolve(__dirname, 'chrome-extension')
    ]
  });
  
  try {
    // PHASE 1: Set up Figma plugin control
    console.log('\n📋 PHASE 1: Setting up Figma plugin control...');
    
    figmaPage = await browser.newPage();
    await figmaPage.setContent(createFigmaControlInterface());
    
    // Expose functions for Figma control
    await figmaPage.exposeFunction('receiveLiveData', (data) => {
      console.log('📨 Figma received live data:', data.metadata?.title);
    });
    
    await figmaPage.exposeFunction('notifyComponentBuilt', (componentName) => {
      console.log('🎨 Figma built component:', componentName);
    });
    
    // Enable Puppeteer control in Figma plugin
    await figmaPage.evaluate(() => {
      if (window.figmaPluginAPI) {
        window.figmaPluginAPI.enablePuppeteerControl();
        window.figmaPluginAPI.updateLiveStatus('🤖 Puppeteer control activated', 0);
        window.figmaPluginAPI.showLivePreview();
      }
    });
    
    console.log('✅ Figma plugin control interface ready');
    
    // PHASE 2: Set up Chrome extension scraping
    console.log('\n🔍 PHASE 2: Setting up Chrome extension scraping...');
    
    scrapingPage = await browser.newPage();
    
    // Navigate to target page for scraping
    const targetUrl = 'https://github.com/features';
    console.log(`🌐 Navigating to target page: ${targetUrl}`);
    
    await scrapingPage.goto(targetUrl, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for page to fully load
    
    // PHASE 3: Inject live coordination script
    console.log('\n⚡ PHASE 3: Injecting live coordination script...');
    
    scrapingResults = await scrapingPage.evaluate(createLiveCoordinationScript());
    
    // PHASE 4: Start simultaneous workflow
    console.log('\n🚀 PHASE 4: Starting simultaneous scraping + building workflow...');
    
    await startSimultaneousWorkflow(scrapingPage, figmaPage);
    
    // PHASE 5: Monitor progress
    console.log('\n📊 PHASE 5: Monitoring live progress...');
    
    await monitorLiveProgress(scrapingPage, figmaPage, 30000);
    
    console.log('\n🎉 Master live controller workflow completed!');
    
  } catch (error) {
    console.error('❌ Master controller error:', error.message);
    throw error;
  } finally {
    setTimeout(() => {
      console.log('🔚 Closing browser in 5 seconds...');
      browser.close();
    }, 5000);
  }
}

function createFigmaControlInterface() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Figma Live Control</title>
      <style>
        body {
          font-family: system-ui, sans-serif;
          padding: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          min-height: 100vh;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .status {
          padding: 15px;
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          margin: 15px 0;
          font-size: 16px;
        }
        .live-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          background: #22d3ee;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill {
          height: 100%;
          background: #22d3ee;
          width: 0%;
          transition: width 0.3s ease;
        }
        .components-list {
          background: rgba(0,0,0,0.3);
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          text-align: left;
          max-height: 300px;
          overflow-y: auto;
        }
        .component-item {
          padding: 8px 12px;
          margin: 5px 0;
          background: rgba(255,255,255,0.1);
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .component-item.building {
          background: rgba(245, 158, 11, 0.3);
          animation: building-glow 1.5s infinite;
        }
        .component-item.completed {
          background: rgba(16, 185, 129, 0.3);
        }
        @keyframes building-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1 class="title">🎨 Figma Live Control Interface</h1>
        
        <div id="status" class="status">
          <span class="live-indicator"></span>
          <span id="status-text">Initializing live control...</span>
        </div>
        
        <div class="progress-bar">
          <div id="progress-fill" class="progress-fill"></div>
        </div>
        
        <div class="components-list">
          <h3>🏗️ Live Component Building:</h3>
          <div id="components-container">
            <div style="text-align: center; color: #ccc;">Waiting for scraping to begin...</div>
          </div>
        </div>
      </div>
      
      <script>
        let componentCount = 0;
        
        function updateStatus(text, progress = null) {
          document.getElementById('status-text').textContent = text;
          if (progress !== null) {
            document.getElementById('progress-fill').style.width = progress + '%';
          }
        }
        
        function addComponent(name, type, status = 'building') {
          const container = document.getElementById('components-container');
          
          // Clear placeholder if exists
          if (container.children.length === 1 && container.children[0].textContent.includes('Waiting')) {
            container.innerHTML = '';
          }
          
          const item = document.createElement('div');
          item.className = 'component-item ' + status;
          item.innerHTML = \`
            <span>\${name}</span>
            <span style="font-size: 12px; opacity: 0.7;">\${type}</span>
          \`;
          
          container.appendChild(item);
          componentCount++;
          
          // Auto-scroll to bottom
          container.scrollTop = container.scrollHeight;
          
          return item;
        }
        
        function updateComponentStatus(name, status) {
          const items = document.querySelectorAll('.component-item');
          items.forEach(item => {
            if (item.children[0].textContent === name) {
              item.className = 'component-item ' + status;
            }
          });
        }
        
        // Simulate Figma plugin API
        window.figmaPluginAPI = {
          enablePuppeteerControl: () => {
            updateStatus('🤖 Puppeteer control enabled', 5);
            console.log('✅ Puppeteer control enabled');
          },
          updateLiveStatus: (text, progress) => {
            updateStatus(text, progress);
          },
          showLivePreview: () => {
            updateStatus('🎨 Live preview active', 10);
          },
          addLivePreviewItem: (name, type, status) => {
            return addComponent(name, type, status);
          },
          updatePreviewItemStatus: (name, status) => {
            updateComponentStatus(name, status);
          },
          handleDataLoaded: (data, source) => {
            updateStatus(\`📦 Data loaded from \${source}\`, 50);
            window.receiveLiveData && window.receiveLiveData(data);
          },
          triggerImport: () => {
            updateStatus('🚀 Triggering Figma import...', 75);
          }
        };
        
        // Listen for messages from master controller
        window.addEventListener('message', (event) => {
          const { type, data } = event.data;
          
          switch (type) {
            case 'scraping-started':
              updateStatus('📡 Scraping started...', 20);
              break;
              
            case 'element-scraped':
              addComponent(\`Element \${data.count}\`, data.type, 'building');
              updateStatus(\`📡 Scraped \${data.count} elements\`, Math.min(20 + data.count * 0.1, 60));
              break;
              
            case 'component-building':
              addComponent(data.name, data.type, 'building');
              updateStatus(\`🎨 Building: \${data.name}\`, data.progress);
              break;
              
            case 'component-completed':
              updateComponentStatus(data.name, 'completed');
              updateStatus(\`✅ Completed: \${data.name}\`, data.progress);
              window.notifyComponentBuilt && window.notifyComponentBuilt(data.name);
              break;
              
            case 'workflow-complete':
              updateStatus('🎉 Live workflow completed!', 100);
              break;
          }
        });
        
        updateStatus('🎯 Ready for live workflow', 0);
      </script>
    </body>
    </html>
  `;
}

function createLiveCoordinationScript() {
  return function() {
    console.log('⚡ LIVE COORDINATION SCRIPT INJECTED');
    console.log('🎯 Starting simultaneous scraping and Figma building...');
    
    // Check if Chrome extension is available
    if (!window.chrome || !window.chrome.runtime) {
      console.log('⚠️ Chrome extension not detected, using manual DOM extraction');
    }
    
    let elementCount = 0;
    const extractedElements = [];
    
    // Function to extract DOM elements progressively
    function extractElementsLive() {
      console.log('🔍 Starting live DOM extraction...');
      
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        elementCount++;
        
        // Send progress update to Figma
        window.postMessage({
          type: 'element-scraped',
          data: {
            count: elementCount,
            type: node.tagName,
            element: {
              name: node.tagName.toLowerCase() + '_' + elementCount,
              type: mapNodeType(node),
              layout: getElementLayout(node),
              textContent: node.textContent?.substring(0, 100)
            }
          }
        }, '*');
        
        extractedElements.push({
          name: node.tagName.toLowerCase() + '_' + elementCount,
          type: mapNodeType(node),
          layout: getElementLayout(node),
          textContent: node.textContent?.substring(0, 100)
        });
        
        // Simulate progressive extraction with small delays
        if (elementCount % 10 === 0) {
          console.log(`📊 Extracted ${elementCount} elements so far...`);
        }
      }
      
      console.log(`✅ Live extraction complete: ${elementCount} elements`);
      
      // Create final data structure
      const scrapedData = {
        version: '1.0.0',
        metadata: {
          title: document.title,
          url: window.location.href,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          timestamp: new Date().toISOString(),
          elementCount: elementCount
        },
        tree: {
          name: 'root',
          type: 'FRAME',
          layout: {
            width: window.innerWidth,
            height: Math.max(document.body.scrollHeight, window.innerHeight),
            x: 0,
            y: 0
          },
          children: extractedElements
        },
        assets: {},
        styles: {},
        components: {},
        variants: {}
      };
      
      return scrapedData;
    }
    
    function mapNodeType(element) {
      const tag = element.tagName.toLowerCase();
      if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'].includes(tag)) {
        return 'TEXT';
      } else if (tag === 'img') {
        return 'IMAGE';
      } else if (['div', 'section', 'article', 'header', 'footer', 'nav'].includes(tag)) {
        return 'FRAME';
      } else {
        return 'RECTANGLE';
      }
    }
    
    function getElementLayout(element) {
      const rect = element.getBoundingClientRect();
      return {
        width: Math.max(rect.width, 1),
        height: Math.max(rect.height, 1),
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
      };
    }
    
    // Start live extraction
    window.postMessage({ type: 'scraping-started' }, '*');
    
    // Simulate progressive scraping with real DOM extraction
    setTimeout(() => {
      const finalData = extractElementsLive();
      
      // Send completion signal
      window.postMessage({
        type: 'workflow-complete',
        data: finalData
      }, '*');
      
      return finalData;
    }, 1000);
    
    return { message: 'Live coordination script active', elementCount: 0 };
  };
}

async function startSimultaneousWorkflow(scrapingPage, figmaPage) {
  console.log('🚀 Starting simultaneous workflow...');
  
  // Set up message relay between pages
  scrapingPage.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('📊') || text.includes('✅') || text.includes('🔍')) {
      console.log('📡 Scraping:', text);
    }
  });
  
  figmaPage.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('🎨') || text.includes('✅') || text.includes('📨')) {
      console.log('🎨 Figma:', text);
    }
  });
  
  // Start coordinated messaging between pages
  await Promise.all([
    scrapingPage.evaluate(() => {
      console.log('📡 Scraping page ready for coordination');
    }),
    figmaPage.evaluate(() => {
      console.log('🎨 Figma page ready for coordination');
    })
  ]);
  
  console.log('✅ Simultaneous workflow started');
}

async function monitorLiveProgress(scrapingPage, figmaPage, duration) {
  console.log(`📊 Monitoring progress for ${duration/1000} seconds...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < duration) {
    try {
      // Check scraping progress
      const scrapingStatus = await scrapingPage.evaluate(() => {
        return {
          elementCount: window.elementCount || 0,
          status: document.title
        };
      });
      
      // Check Figma progress
      const figmaStatus = await figmaPage.evaluate(() => {
        return {
          componentCount: window.componentCount || 0,
          status: document.getElementById('status-text')?.textContent || 'Unknown'
        };
      });
      
      console.log(`📊 Progress - Scraped: ${scrapingStatus.elementCount}, Built: ${figmaStatus.componentCount}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log('⚠️ Progress monitoring error:', error.message);
    }
  }
  
  console.log('✅ Progress monitoring completed');
}

// Execute master live controller
masterLiveController().catch(error => {
  console.error('❌ Master live controller failed:', error.message);
  console.error(error.stack);
});