const puppeteer = require('puppeteer');

async function simplifiedLiveWorkflow() {
  console.log('🚀 SIMPLIFIED LIVE WORKFLOW - Simultaneous Scraping + Figma Building');
  console.log('🎯 Real-time demonstration of live scraping and component building');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--disable-web-security']
  });
  
  try {
    // Create live dashboard
    const dashboardPage = await browser.newPage();
    await dashboardPage.setContent(createSimplifiedDashboard());
    
    console.log('✅ Live dashboard created');
    
    // Create scraping simulation page
    const scrapingPage = await browser.newPage();
    await scrapingPage.goto('https://github.com/features', { waitUntil: 'networkidle0' });
    
    console.log('✅ Navigated to GitHub Features page');
    
    // Start live scraping simulation
    await scrapingPage.evaluate(() => {
      console.log('🔍 Starting live scraping simulation...');
      
      // Count actual elements on the page
      let elementCount = 0;
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function(node) {
            if (['SCRIPT', 'META', 'LINK', 'STYLE'].includes(node.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            const style = window.getComputedStyle(node);
            if (style.display === 'none') {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      while (walker.nextNode()) {
        elementCount++;
      }
      
      console.log('📊 Found ' + elementCount + ' elements on GitHub Features page');
      
      // Store the count for use by the workflow
      window.actualElementCount = elementCount;
      
      return elementCount;
    });
    
    // Start the live workflow simulation
    await startLiveWorkflowSimulation(dashboardPage, scrapingPage);
    
    console.log('🎉 Live workflow demonstration completed!');
    
    // Keep browser open for 30 seconds to see the demo
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Workflow error:', error.message);
  } finally {
    setTimeout(() => browser.close(), 5000);
  }
}

function createSimplifiedDashboard() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Live Scraping + Figma Building Demo</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 30px;
          height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .title {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          opacity: 0.8;
        }
        .workflow-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          flex: 1;
        }
        .panel {
          background: rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 25px;
          display: flex;
          flex-direction: column;
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .panel-title {
          font-size: 20px;
          font-weight: 600;
        }
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .status-dot.active { background: #22d3ee; }
        .status-dot.building { background: #f59e0b; }
        .status-dot.completed { background: #10b981; }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        .stat-card {
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #22d3ee;
          margin-bottom: 5px;
        }
        .stat-label {
          font-size: 12px;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #22d3ee, #10b981);
          width: 0%;
          transition: width 0.3s ease;
        }
        .activity-log {
          flex: 1;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 15px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 12px;
          overflow-y: auto;
        }
        .log-entry {
          margin: 3px 0;
          padding: 4px 8px;
          border-radius: 4px;
          animation: slideIn 0.3s ease;
        }
        .log-scraping { background: rgba(34, 211, 238, 0.2); }
        .log-building { background: rgba(245, 158, 11, 0.2); }
        .log-completed { background: rgba(16, 185, 129, 0.2); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .components-preview {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
          overflow-y: auto;
        }
        .component-card {
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 10px;
          border-left: 3px solid #6b7280;
          transition: all 0.3s ease;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .component-card.building {
          border-left-color: #f59e0b;
          animation: building-glow 1.5s infinite;
        }
        .component-card.completed {
          border-left-color: #10b981;
        }
        @keyframes building-glow {
          0%, 100% { background: rgba(255,255,255,0.1); }
          50% { background: rgba(245, 158, 11, 0.2); }
        }
        .component-name {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 3px;
        }
        .component-type {
          font-size: 9px;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">🚀 Live Scraping + Figma Building</h1>
          <p class="subtitle">Real-time demonstration of simultaneous webpage analysis and component creation</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div id="scraped-count" class="stat-value">0</div>
            <div class="stat-label">Elements Scraped</div>
          </div>
          <div class="stat-card">
            <div id="built-count" class="stat-value">0</div>
            <div class="stat-label">Components Built</div>
          </div>
          <div class="stat-card">
            <div id="progress-percent" class="stat-value">0%</div>
            <div class="stat-label">Progress</div>
          </div>
        </div>
        
        <div class="workflow-grid">
          <div class="panel">
            <div class="panel-header">
              <span id="scraping-status" class="status-dot active"></span>
              <h2 class="panel-title">📡 Live Scraping</h2>
            </div>
            <div class="progress-bar">
              <div id="scraping-progress" class="progress-fill"></div>
            </div>
            <div id="scraping-log" class="activity-log">
              <div class="log-entry log-scraping">🔍 Initializing scraping engine...</div>
            </div>
          </div>
          
          <div class="panel">
            <div class="panel-header">
              <span id="building-status" class="status-dot"></span>
              <h2 class="panel-title">🎨 Figma Building</h2>
            </div>
            <div class="progress-bar">
              <div id="building-progress" class="progress-fill"></div>
            </div>
            <div id="components-preview" class="components-preview">
              <!-- Components will appear here -->
            </div>
          </div>
        </div>
      </div>
      
      <script>
        let scrapedCount = 0;
        let builtCount = 0;
        let totalElements = 1880; // GitHub Features page element count
        
        function updateStats() {
          document.getElementById('scraped-count').textContent = scrapedCount;
          document.getElementById('built-count').textContent = builtCount;
          const progress = Math.round((Math.max(scrapedCount, builtCount) / totalElements) * 100);
          document.getElementById('progress-percent').textContent = progress + '%';
        }
        
        function addLogEntry(message, type = 'scraping') {
          const log = document.getElementById('scraping-log');
          const entry = document.createElement('div');
          entry.className = 'log-entry log-' + type;
          entry.innerHTML = new Date().toLocaleTimeString() + ' - ' + message;
          log.appendChild(entry);
          log.scrollTop = log.scrollHeight;
          
          // Keep only last 20 entries
          while (log.children.length > 20) {
            log.removeChild(log.firstChild);
          }
        }
        
        function addComponent(name, type, status = 'building') {
          const preview = document.getElementById('components-preview');
          const card = document.createElement('div');
          card.className = 'component-card ' + status;
          card.id = 'comp-' + name.replace(/\\s+/g, '-');
          card.innerHTML = 
            '<div class="component-name">' + name + '</div>' +
            '<div class="component-type">' + type + '</div>';
          preview.appendChild(card);
          
          if (status === 'building') {
            document.getElementById('building-status').className = 'status-dot building';
          }
        }
        
        function updateComponentStatus(name, status) {
          const card = document.getElementById('comp-' + name.replace(/\\s+/g, '-'));
          if (card) {
            card.className = 'component-card ' + status;
            if (status === 'completed') {
              builtCount++;
              updateStats();
            }
          }
        }
        
        function updateProgress(type, percent) {
          document.getElementById(type + '-progress').style.width = percent + '%';
        }
        
        // Start live workflow simulation
        function startLiveDemo() {
          addLogEntry('🌐 Connected to GitHub Features page');
          updateProgress('scraping', 5);
          
          // Simulate progressive scraping
          let scrapingInterval = setInterval(() => {
            if (scrapedCount >= totalElements) {
              clearInterval(scrapingInterval);
              addLogEntry('✅ Scraping completed - ' + totalElements + ' elements', 'completed');
              document.getElementById('scraping-status').className = 'status-dot completed';
              updateProgress('scraping', 100);
              return;
            }
            
            // Add elements in batches
            const batchSize = Math.floor(Math.random() * 8) + 3;
            scrapedCount = Math.min(scrapedCount + batchSize, totalElements);
            
            if (scrapedCount % 100 === 0 || scrapedCount >= totalElements) {
              addLogEntry('📊 Scraped ' + scrapedCount + ' elements');
            }
            
            updateProgress('scraping', (scrapedCount / totalElements) * 100);
            updateStats();
            
            // Trigger component building with delay
            if (scrapedCount > 50 && Math.random() > 0.6) {
              setTimeout(() => {
                const componentTypes = ['FRAME', 'TEXT', 'RECTANGLE', 'IMAGE'];
                const componentName = 'Component ' + (builtCount + 1);
                const componentType = componentTypes[Math.floor(Math.random() * componentTypes.length)];
                
                addComponent(componentName, componentType, 'building');
                
                // Complete after random delay
                setTimeout(() => {
                  updateComponentStatus(componentName, 'completed');
                  updateProgress('building', (builtCount / totalElements) * 100);
                  
                  if (builtCount >= totalElements) {
                    document.getElementById('building-status').className = 'status-dot completed';
                    addLogEntry('🎉 All components built!', 'completed');
                  }
                }, Math.random() * 1500 + 500);
                
              }, Math.random() * 800 + 200);
            }
          }, 120);
        }
        
        // Initialize demo
        setTimeout(() => {
          addLogEntry('🚀 Starting live workflow demonstration');
          startLiveDemo();
        }, 2000);
        
        updateStats();
      </script>
    </body>
    </html>
  `;
}

async function startLiveWorkflowSimulation(dashboardPage, scrapingPage) {
  console.log('🎯 Starting live workflow simulation...');
  
  // Get actual element count from the scraped page
  const actualCount = await scrapingPage.evaluate(() => {
    return window.actualElementCount || 1880;
  });
  
  console.log('📊 Actual GitHub Features elements:', actualCount);
  
  // Update dashboard with real count
  await dashboardPage.evaluate((count) => {
    totalElements = count;
    document.querySelector('.stat-label').parentElement.querySelector('.stat-value').textContent = '0';
  }, actualCount);
  
  // Monitor progress
  let lastScrapedCount = 0;
  let lastBuiltCount = 0;
  
  const progressInterval = setInterval(async () => {
    try {
      const stats = await dashboardPage.evaluate(() => {
        return {
          scraped: parseInt(document.getElementById('scraped-count').textContent),
          built: parseInt(document.getElementById('built-count').textContent),
          progress: document.getElementById('progress-percent').textContent
        };
      });
      
      if (stats.scraped !== lastScrapedCount || stats.built !== lastBuiltCount) {
        console.log('📊 Progress Update - Scraped: ' + stats.scraped + ', Built: ' + stats.built + ', Overall: ' + stats.progress);
        lastScrapedCount = stats.scraped;
        lastBuiltCount = stats.built;
      }
      
      // Stop monitoring when complete
      if (stats.scraped >= actualCount && stats.built >= actualCount) {
        clearInterval(progressInterval);
        console.log('🎉 Live workflow simulation completed successfully!');
      }
      
    } catch (error) {
      // Ignore monitoring errors
    }
  }, 2000);
  
  // Stop monitoring after 25 seconds
  setTimeout(() => {
    clearInterval(progressInterval);
  }, 25000);
}

// Execute simplified live workflow
simplifiedLiveWorkflow().catch(error => {
  console.error('❌ Simplified live workflow failed:', error.message);
});