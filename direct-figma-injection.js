const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function directFigmaInjection() {
  console.log('🎯 DIRECT FIGMA INJECTION - Sending scraped data to your plugin');
  
  // Find the latest live capture file
  const files = fs.readdirSync(__dirname)
    .filter(file => file.startsWith('live-capture-') && file.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.error('❌ No live capture data found. Run the live workflow first.');
    return;
  }
  
  const latestCapture = files[0];
  const capturePath = path.join(__dirname, latestCapture);
  
  console.log(`📂 Using latest capture: ${latestCapture}`);
  
  try {
    const liveData = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
    
    console.log('📊 Live data loaded:');
    console.log(`  - Page: ${liveData.metadata?.title}`);
    console.log(`  - Elements: ${countNodes(liveData.tree)}`);
    console.log(`  - URL: ${liveData.metadata?.url}`);
    
    // Copy to clipboard for immediate use
    console.log('📋 Copying live data to clipboard...');
    
    const copyProcess = exec('pbcopy', (error) => {
      if (error) {
        console.error('❌ Clipboard copy failed:', error);
        return;
      }
      console.log('✅ Live data copied to clipboard!');
    });
    
    copyProcess.stdin.write(JSON.stringify(liveData));
    copyProcess.stdin.end();
    
    // Wait for clipboard operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n🎯 IMMEDIATE ACTION REQUIRED:');
    console.log('1. Switch to your open Figma plugin');
    console.log('2. Open browser console (F12) in the plugin UI');
    console.log('3. Paste and execute this code:');
    console.log('\n' + '='.repeat(60));
    console.log(`
// PASTE THIS IN YOUR FIGMA PLUGIN CONSOLE:
const liveData = ${JSON.stringify(liveData, null, 2)};

parent.postMessage({ 
  pluginMessage: { 
    type: 'auto-import-data', 
    data: liveData 
  } 
}, '*');

console.log('✅ Live Figma.com data sent to plugin - import starting!');
    `);
    console.log('='.repeat(60));
    
    console.log('\n⚡ OR alternatively:');
    console.log('1. Click "Paste from Clipboard" in your Figma plugin');
    console.log('2. Click "Import to Figma"');
    console.log('\n🎨 The Figma.com webpage will appear on your canvas as editable components!');
    
  } catch (error) {
    console.error('❌ Failed to process live data:', error.message);
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

// Execute direct injection
directFigmaInjection();