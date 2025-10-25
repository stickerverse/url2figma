const fs = require('fs');

function directPluginInjection() {
  console.log('🎯 DIRECT FIGMA PLUGIN INJECTION');
  console.log('📋 This will give you the exact code to paste in your Figma plugin console');
  
  // Load the real scraped data
  const jsonFile = 'auto-capture-2025-10-25T01-58-54-822Z.json';
  if (!fs.existsSync(jsonFile)) {
    console.error('❌ Scraped data file not found:', jsonFile);
    return;
  }
  
  const scrapedData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  console.log('📊 Loaded GitHub Features data:', countNodes(scrapedData.tree), 'elements');
  
  console.log('\n🔵 STEP-BY-STEP INSTRUCTIONS:');
  console.log('=' .repeat(80));
  console.log('1. Open Figma Desktop');
  console.log('2. Open your "Web to Figma" plugin');
  console.log('3. In the plugin window, press F12 to open Developer Tools');
  console.log('4. Go to the Console tab');
  console.log('5. Copy and paste the code below');
  console.log('6. Press Enter to execute');
  console.log('=' .repeat(80));
  
  console.log('\n📋 COPY THIS CODE INTO YOUR FIGMA PLUGIN CONSOLE:');
  console.log('=' .repeat(80));
  
  // Create the exact injection code
  const injectionCode = `
// GitHub Features Data Injection
const githubData = ${JSON.stringify(scrapedData, null, 2)};

console.log('🚀 Injecting GitHub Features data...');
console.log('📊 Elements to build:', ${countNodes(scrapedData.tree)});

// Send to plugin backend
parent.postMessage({
  pluginMessage: {
    type: 'live-import',
    data: githubData,
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

console.log('✅ Data sent to Figma plugin backend!');
console.log('🎨 Check your Figma canvas for components being built!');
`;

  console.log(injectionCode);
  console.log('=' .repeat(80));
  
  console.log('\n⚡ WHAT WILL HAPPEN:');
  console.log('✅ ' + countNodes(scrapedData.tree) + ' Figma elements will be created');
  console.log('✅ A frame called "GitHub Features · GitHub - Main (Live)" will appear');
  console.log('✅ Components will build progressively with live updates');
  console.log('✅ You\'ll see the actual GitHub Features page layout in Figma');
  
  console.log('\n🎯 ALTERNATIVE METHOD - File Upload:');
  console.log('If console injection doesn\'t work:');
  console.log('1. Use the "Choose JSON File" button in your plugin');
  console.log('2. Select: ' + jsonFile);
  console.log('3. Click "Import to Figma"');
  
  // Also save the injection code to a file for easy copying
  const codeFile = 'figma-injection-code.js';
  fs.writeFileSync(codeFile, injectionCode);
  console.log('\n📁 Injection code also saved to:', codeFile);
  console.log('You can copy from this file if needed');
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

// Execute direct injection helper
directPluginInjection();