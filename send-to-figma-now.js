const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Read the latest scraped data
const jsonFile = 'auto-capture-2025-10-25T01-58-54-822Z.json';
const scrapedData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

console.log('📨 SENDING SCRAPED DATA TO YOUR FIGMA PLUGIN NOW');
console.log(`📊 Data: ${scrapedData.metadata?.title}`);
console.log(`🔢 Elements: ${countNodes(scrapedData.tree)}`);

// Copy to clipboard immediately
console.log('📋 Copying JSON to clipboard...');
const copyProcess = exec('pbcopy', (error) => {
  if (error) {
    console.error('❌ Clipboard failed:', error);
  } else {
    console.log('✅ JSON data copied to clipboard');
  }
});

copyProcess.stdin.write(JSON.stringify(scrapedData));
copyProcess.stdin.end();

// Show the exact code to paste
console.log('\n🎯 PASTE THIS EXACT CODE IN YOUR FIGMA PLUGIN CONSOLE:');
console.log('==========================================');
console.log('// Paste this in your Figma plugin browser console (F12):');
console.log(`
parent.postMessage({ 
  pluginMessage: { 
    type: 'auto-import-data', 
    data: ${JSON.stringify(scrapedData)}
  } 
}, '*');

console.log('✅ GitHub Features data sent to Figma plugin!');
`);
console.log('==========================================');

console.log('\n📌 ALTERNATIVE METHODS:');
console.log('1. Click "Paste from Clipboard" in your Figma plugin (data is ready)');
console.log('2. Use the console code above for direct injection');
console.log('\n🎨 This will create the GitHub Features page on your Figma canvas!');

function countNodes(node) {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}