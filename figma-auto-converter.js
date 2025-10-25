// 🚀 FIGMA AUTO CONVERTER - Paste this into your Figma plugin console
// This will automatically load the scraped data and convert to Figma components

console.log('🚀 Starting Figma Auto Conversion...');

// First, check if we have the latest data file
const dataFileName = 'direct-send-2025-10-25T03-52-17.json';

// Load the data (you'll need to paste the actual data here or load from file)
console.log('📋 To complete the auto conversion:');
console.log('1. Open your Figma plugin');
console.log('2. Load the JSON file: ' + dataFileName);
console.log('3. Or paste the data directly');

// Auto conversion function that works with your plugin
function autoConvertToFigma(jsonData) {
  console.log('🎨 Converting ' + jsonData.metadata.totalElements + ' elements to Figma...');
  
  try {
    // Method 1: Try live import if available
    if (typeof window.handleLiveImport === 'function') {
      window.handleLiveImport(jsonData);
      console.log('✅ Conversion started via handleLiveImport');
      return true;
    }
    
    // Method 2: Try postMessage to plugin
    if (typeof parent.postMessage === 'function') {
      parent.postMessage({
        pluginMessage: {
          type: 'live-import',
          data: jsonData
        }
      }, '*');
      console.log('✅ Conversion started via postMessage');
      return true;
    }
    
    // Method 3: Try figma API directly
    if (typeof figma !== 'undefined' && figma.ui) {
      figma.ui.postMessage({
        type: 'import-data',
        data: jsonData
      });
      console.log('✅ Conversion started via figma.ui.postMessage');
      return true;
    }
    
    // Method 4: Store data and trigger import button
    window.autoConversionData = jsonData;
    
    const importBtn = document.getElementById('import-btn') || 
                     document.querySelector('[data-action="import"]') ||
                     document.querySelector('button[class*="import"]') ||
                     document.querySelector('button');
    
    if (importBtn) {
      // If it's a file input, simulate file selection
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const file = new File([blob], dataFileName, { type: 'application/json' });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        
        console.log('✅ File uploaded automatically');
      } else {
        importBtn.click();
        console.log('✅ Import button clicked');
      }
      return true;
    }
    
    console.log('📋 Data stored as window.autoConversionData');
    console.log('💡 Manually trigger import or access data from window.autoConversionData');
    return false;
    
  } catch (error) {
    console.error('❌ Auto conversion error:', error.message);
    return false;
  }
}

// Instructions for manual data loading
console.log('\n🔧 MANUAL DATA LOADING INSTRUCTIONS:');
console.log('1. Copy the JSON data from: ' + dataFileName);
console.log('2. Call: autoConvertToFigma(yourJsonData)');
console.log('3. Or load via your plugin\'s file input');

console.log('\n📋 READY FOR AUTO CONVERSION!');
console.log('The autoConvertToFigma() function is now available.');

// Export the function globally
window.autoConvertToFigma = autoConvertToFigma;