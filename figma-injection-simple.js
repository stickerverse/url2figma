const fs = require('fs');
const path = require('path');

// Get the latest live capture
const files = fs.readdirSync(__dirname)
  .filter(file => file.startsWith('live-capture-') && file.endsWith('.json'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.error('❌ No live capture found');
  process.exit(1);
}

const liveData = JSON.parse(fs.readFileSync(path.join(__dirname, files[0]), 'utf8'));

console.log('🎯 READY TO INJECT INTO YOUR FIGMA PLUGIN');
console.log(`📊 Scraped: ${liveData.metadata?.title}`);
console.log(`🔢 Elements: ${countNodes(liveData.tree)}`);

console.log('\n📋 COPY THIS CODE INTO YOUR FIGMA PLUGIN CONSOLE:');
console.log('='.repeat(80));
console.log(`
parent.postMessage({ 
  pluginMessage: { 
    type: 'auto-import-data', 
    data: ${JSON.stringify(liveData)} 
  } 
}, '*');

console.log('✅ Figma.com webpage data sent to plugin!');
`);
console.log('='.repeat(80));

function countNodes(node) {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}