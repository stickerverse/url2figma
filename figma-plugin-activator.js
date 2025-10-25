const puppeteer = require('puppeteer');
const fs = require('fs');

async function figmaPluginActivator() {
  console.log('🎯 FIGMA PLUGIN ACTIVATOR - Direct Plugin Communication');
  console.log('🔵 This will directly communicate with your open Figma plugin');
  
  // Load the real scraped data
  const jsonFile = 'auto-capture-2025-10-25T01-58-54-822Z.json';
  if (!fs.existsSync(jsonFile)) {
    console.error('❌ Scraped data file not found:', jsonFile);
    return;
  }
  
  const scrapedData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log('📊 Loaded GitHub Features data:', countNodes(scrapedData.tree), 'elements');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false
  });
  
  try {
    const page = await browser.newPage();
    
    // Create a direct communication page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Direct Figma Plugin Communication</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            background: #0f172a;
            color: white;
            padding: 50px;
            text-align: center;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #1e293b;
            padding: 40px;
            border-radius: 16px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #22d3ee;
          }
          .instructions {
            background: #374151;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
            line-height: 1.6;
          }
          .code-block {
            background: #111827;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            margin: 15px 0;
            border-left: 4px solid #22d3ee;
            overflow-x: auto;
          }
          .status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: 500;
          }
          .status.info { background: #1e40af; }
          .status.success { background: #065f46; }
          .status.warning { background: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="title">🎯 Direct Figma Plugin Communication</h1>
          
          <div class="status info">
            📊 Ready to send ${countNodes(scrapedData.tree)} elements from GitHub Features page to your Figma plugin
          </div>
          
          <div class="instructions">
            <h3>🔵 Step 1: Open your Figma plugin</h3>
            <p>Make sure your "Web to Figma" plugin is open in Figma Desktop</p>
            
            <h3>🔵 Step 2: Open browser developer tools</h3>
            <p>In your Figma plugin window, press F12 to open developer tools</p>
            
            <h3>🔵 Step 3: Paste and run this code in the console:</h3>
            <div class="code-block" id="injection-code">
// Direct injection of GitHub Features data
parent.postMessage({
  pluginMessage: {
    type: 'live-import',
    data: ${JSON.stringify(scrapedData)},
    options: {
      createMainFrame: true,
      createVariantsFrame: false,
      createComponentsFrame: false,
      createDesignSystem: false,
      applyAutoLayout: true,
      createStyles: false
    }
  }
}, '*');

console.log('✅ GitHub Features data sent to Figma plugin!');
            </div>
          </div>
          
          <div class="status success">
            🎨 After running the code, check your Figma canvas for the GitHub Features components!
          </div>
          
          <div class="status warning">
            ⚡ Expected result: ${countNodes(scrapedData.tree)} Figma frames and components will be created
          </div>
        </div>
        
        <script>
          // Copy code to clipboard automatically
          const code = document.getElementById('injection-code').textContent;
          navigator.clipboard.writeText(code.trim()).then(() => {
            console.log('📋 Injection code copied to clipboard');
          }).catch(() => {
            console.log('⚠️ Could not copy to clipboard automatically');
          });
          
          console.log('🎯 Direct Figma plugin communication page loaded');
          console.log('📋 Injection code has been copied to clipboard');
          console.log('🔵 Follow the instructions to inject data into your Figma plugin');
        </script>
      </body>
      </html>
    `);
    
    console.log('\n🎯 DIRECT INJECTION INSTRUCTIONS:');
    console.log('=' .repeat(80));
    console.log('1. 🔵 Open your Figma plugin (Web to Figma)');
    console.log('2. 🔵 Press F12 in the plugin to open developer tools');
    console.log('3. 🔵 Go to the Console tab');
    console.log('4. 🔵 Paste the code from the webpage and press Enter');
    console.log('5. 🔵 Watch your Figma canvas for components being created!');
    console.log('=' .repeat(80));
    console.log('\n📋 The injection code has been copied to your clipboard');
    console.log('🎨 Expected result: ' + countNodes(scrapedData.tree) + ' Figma components will be created');
    
    // Keep the page open for instructions
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('❌ Plugin activator error:', error.message);
  } finally {
    setTimeout(() => browser.close(), 5000);
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

// Execute plugin activator
figmaPluginActivator().catch(error => {
  console.error('❌ Plugin activator failed:', error.message);
});