const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function sendToFigmaPlugin() {
  console.log('📨 Preparing to send data to Figma plugin...');
  
  // Read the captured data
  const dataFile = path.join(__dirname, 'figma-ready-data.json');
  
  if (!fs.existsSync(dataFile)) {
    console.error('❌ No captured data found. Please run the capture workflow first.');
    return;
  }
  
  try {
    const jsonData = fs.readFileSync(dataFile, 'utf8');
    const data = JSON.parse(jsonData);
    
    console.log('📋 Data loaded successfully:');
    console.log(`  - Page: ${data.metadata?.title}`);
    console.log(`  - Elements: ${countNodes(data.tree)}`);
    console.log(`  - URL: ${data.metadata?.url}`);
    
    // Copy to clipboard
    console.log('📋 Copying data to clipboard...');
    
    // Use pbcopy on macOS to copy to clipboard
    const copyProcess = exec('pbcopy', (error) => {
      if (error) {
        console.error('❌ Failed to copy to clipboard:', error);
        console.log('💡 Manual copy required:');
        console.log('Copy the contents of figma-ready-data.json manually');
        return;
      }
      
      console.log('✅ Data copied to clipboard successfully!');
      console.log('\n🎯 NEXT STEPS:');
      console.log('1. Switch to your Figma plugin window');
      console.log('2. Click "Paste from Clipboard" button');
      console.log('3. Click "Import to Figma" to convert to Figma design');
      console.log('\n⚡ The JSON data is now in your clipboard and ready to paste!');
    });
    
    copyProcess.stdin.write(jsonData);
    copyProcess.stdin.end();
    
  } catch (error) {
    console.error('❌ Failed to process data:', error.message);
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

// Run the send process
sendToFigmaPlugin();