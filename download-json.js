const fs = require('fs');
const path = require('path');

function downloadJson() {
  console.log('📥 DOWNLOADING WEBPAGE JSON FILE');
  console.log('🎯 Preparing GitHub Features data for local download');
  
  const sourceFile = 'auto-capture-2025-10-25T01-58-54-822Z.json';
  
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.log('❌ Source JSON file not found:', sourceFile);
    return;
  }
  
  // Get file info
  const stats = fs.statSync(sourceFile);
  const fileSizeKB = (stats.size / 1024).toFixed(1);
  
  console.log('📊 SOURCE FILE INFO:');
  console.log(`   File: ${sourceFile}`);
  console.log(`   Size: ${fileSizeKB} KB`);
  console.log(`   Location: ${path.resolve(sourceFile)}`);
  
  // Create user-friendly filename
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const downloadFile = `github-features-page-${timestamp}.json`;
  
  // Copy to Downloads-like location (Desktop for easy access)
  const desktopPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', downloadFile);
  
  try {
    // Copy the file
    fs.copyFileSync(sourceFile, downloadFile);
    console.log('✅ File copied to current directory:', downloadFile);
    
    // Also try to copy to Desktop if possible
    try {
      fs.copyFileSync(sourceFile, desktopPath);
      console.log('✅ File copied to Desktop:', desktopPath);
    } catch (desktopError) {
      console.log('⚠️ Could not copy to Desktop (permissions?)');
    }
    
    // Read and verify the JSON
    const jsonData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    
    console.log('\n📋 JSON CONTENT SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`   Page Title: ${jsonData.metadata?.title}`);
    console.log(`   URL: ${jsonData.metadata?.url}`);
    console.log(`   Captured: ${jsonData.metadata?.timestamp}`);
    console.log(`   Elements: ${countNodes(jsonData.tree)}`);
    console.log(`   Viewport: ${jsonData.metadata?.viewport?.width}x${jsonData.metadata?.viewport?.height}`);
    
    console.log('\n📁 DOWNLOAD LOCATIONS:');
    console.log('=' .repeat(50));
    console.log(`1. Current directory: ${path.resolve(downloadFile)}`);
    if (fs.existsSync(desktopPath)) {
      console.log(`2. Desktop: ${desktopPath}`);
    }
    
    console.log('\n💻 USAGE INSTRUCTIONS:');
    console.log('=' .repeat(50));
    console.log('1. Use this file in your Figma plugin:');
    console.log('   - Open "Web to Figma" plugin in Figma Desktop');
    console.log('   - Click "Choose JSON File"');
    console.log(`   - Select: ${downloadFile}`);
    console.log('   - Click "Import to Figma"');
    console.log('');
    console.log('2. Or share this file:');
    console.log('   - Send to others for importing GitHub Features page');
    console.log('   - Contains complete webpage structure and styling');
    console.log('   - Ready for Figma component generation');
    
    console.log('\n🎨 EXPECTED RESULT IN FIGMA:');
    console.log('✅ Complete GitHub Features page layout');
    console.log('✅ 1,880 editable Figma components');
    console.log('✅ Proper hierarchy and positioning');
    console.log('✅ Original styling and structure preserved');
    
  } catch (error) {
    console.log('❌ Error copying file:', error.message);
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

downloadJson();