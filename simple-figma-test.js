const fs = require('fs');

console.log('🎯 SIMPLE FIGMA TEST - File Upload Method');
console.log('📋 Use this method to test if your Figma plugin is working');

// Check if the JSON file exists
const jsonFile = 'auto-capture-2025-10-25T01-58-54-822Z.json';
if (fs.existsSync(jsonFile)) {
  const stats = fs.statSync(jsonFile);
  const fileSizeKB = (stats.size / 1024).toFixed(1);
  
  console.log('✅ GitHub Features data file found:');
  console.log(`   File: ${jsonFile}`);
  console.log(`   Size: ${fileSizeKB} KB`);
  console.log(`   Path: ${process.cwd()}/${jsonFile}`);
  
  console.log('\n🔵 EASIEST METHOD - File Upload:');
  console.log('=' .repeat(60));
  console.log('1. Open your Figma plugin ("Web to Figma")');
  console.log('2. Click "Choose JSON File" button');
  console.log('3. Navigate to this folder and select:');
  console.log(`   ${jsonFile}`);
  console.log('4. Click "Import to Figma"');
  console.log('=' .repeat(60));
  
  console.log('\n⚡ WHAT SHOULD HAPPEN:');
  console.log('✅ Plugin should show "Ready to import"');
  console.log('✅ Progress bar should appear');
  console.log('✅ "GitHub Features · GitHub - Main" frame created on canvas');
  console.log('✅ 1,880 Figma elements/components built');
  console.log('✅ Complete GitHub Features page layout in Figma');
  
  console.log('\n🔍 TROUBLESHOOTING:');
  console.log('If nothing happens:');
  console.log('- Check that the plugin loaded the file (should show filename)');
  console.log('- Make sure you clicked "Import to Figma" button');
  console.log('- Check browser console in plugin (F12) for errors');
  console.log('- Try closing and reopening the plugin');
  
  // Parse and show some data info
  try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    console.log('\n📊 DATA VERIFICATION:');
    console.log(`   Page: ${data.metadata?.title}`);
    console.log(`   URL: ${data.metadata?.url}`);
    console.log(`   Elements: ${countNodes(data.tree)}`);
    console.log(`   Timestamp: ${data.metadata?.timestamp}`);
  } catch (error) {
    console.log('⚠️ Error reading JSON file:', error.message);
  }
  
} else {
  console.log('❌ GitHub Features data file not found!');
  console.log('Please run the scraping workflow first to generate the data file.');
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