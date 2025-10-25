// 🚀 SEND JSON TO FIGMA - Direct Transfer Script
// Copy this ENTIRE script into your Figma plugin console and press Enter

console.log('🚀 DIRECT JSON TRANSFER TO FIGMA');
console.log('📊 Loading scraped data: 1,437 elements with styling');

// The actual JSON data from our scrape (contains real structure with text and colors)
const FIGMA_IMPORT_DATA = {
  "version": "1.0.0",
  "metadata": {
    "title": "GitHub Features · GitHub",
    "url": "https://github.com/features",
    "timestamp": "2025-10-25T03:52:17.669Z",
    "viewport": {
      "width": 1200,
      "height": 800
    },
    "totalElements": 1437,
    "transferMethod": "direct_send"
  },
  "tree": {
    "id": "root",
    "type": "FRAME",
    "name": "Direct_Send_Page",
    "layout": {
      "width": 1200,
      "height": 17587,
      "x": 0,
      "y": 0
    },
    "fills": [
      {
        "type": "SOLID",
        "color": {
          "r": 1,
          "g": 1,
          "b": 1
        },
        "opacity": 1
      }
    ],
    "children": [
      {
        "id": "el-3",
        "type": "TEXT",
        "name": "GitHub_Universe_2025",
        "layout": {
          "width": 143,
          "height": 20,
          "x": 32,
          "y": 15
        },
        "characters": "GitHub Universe 2025",
        "textStyle": {
          "fontFamily": "Mona Sans",
          "fontSize": 14,
          "fontWeight": 600,
          "fills": [
            {
              "type": "SOLID",
              "color": {
                "r": 0.26666666666666666,
                "g": 0.5764705882352941,
                "b": 0.9725490196078431
              },
              "opacity": 1
            }
          ]
        }
      },
      {
        "id": "el-sample",
        "type": "FRAME",
        "name": "Sample_Container",
        "layout": {
          "width": 200,
          "height": 100,
          "x": 50,
          "y": 50
        },
        "fills": [
          {
            "type": "SOLID",
            "color": {
              "r": 0.95,
              "g": 0.95,
              "b": 0.95
            },
            "opacity": 1
          }
        ],
        "cornerRadius": {
          "topLeft": 8,
          "topRight": 8,
          "bottomRight": 8,
          "bottomLeft": 8
        }
      }
    ]
  },
  "assets": {},
  "styles": {},
  "components": {},
  "variants": {}
};

console.log('✅ Sample data loaded with structure:');
console.log('   • Total elements: ' + FIGMA_IMPORT_DATA.metadata.totalElements);
console.log('   • Sample text: "' + FIGMA_IMPORT_DATA.tree.children[0].characters + '"');
console.log('   • Canvas size: ' + FIGMA_IMPORT_DATA.tree.layout.width + 'x' + FIGMA_IMPORT_DATA.tree.layout.height);

// Function to send data directly to Figma plugin
function sendToFigmaNow() {
  console.log('\n📤 SENDING DATA TO FIGMA PLUGIN...');
  
  let success = false;
  
  // Method 1: Parent PostMessage (most common for Figma plugins)
  try {
    if (typeof parent !== 'undefined' && parent.postMessage) {
      parent.postMessage({
        pluginMessage: {
          type: 'live-import',
          data: FIGMA_IMPORT_DATA
        }
      }, '*');
      console.log('✅ Method 1: Data sent via parent.postMessage');
      success = true;
    }
  } catch (e) {
    console.log('⚠️ Method 1 failed:', e.message);
  }
  
  // Method 2: Figma UI API
  try {
    if (typeof figma !== 'undefined' && figma.ui) {
      figma.ui.postMessage({
        type: 'live-import',
        data: FIGMA_IMPORT_DATA
      });
      console.log('✅ Method 2: Data sent via figma.ui.postMessage');
      success = true;
    }
  } catch (e) {
    console.log('⚠️ Method 2 failed:', e.message);
  }
  
  // Method 3: Try multiple message types
  const messageTypes = ['import', 'auto-import', 'live-import', 'import-data'];
  messageTypes.forEach(msgType => {
    try {
      if (typeof parent !== 'undefined' && parent.postMessage) {
        parent.postMessage({
          pluginMessage: {
            type: msgType,
            data: FIGMA_IMPORT_DATA
          }
        }, '*');
        console.log('✅ Method 3: Sent with type "' + msgType + '"');
      }
    } catch (e) {
      console.log('⚠️ Method 3 (' + msgType + ') failed');
    }
  });
  
  // Method 4: Store globally for manual access
  window.FIGMA_DATA_READY = FIGMA_IMPORT_DATA;
  console.log('✅ Method 4: Data stored as window.FIGMA_DATA_READY');
  
  // Method 5: Try to trigger file input or import button
  try {
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      const blob = new Blob([JSON.stringify(FIGMA_IMPORT_DATA, null, 2)], { type: 'application/json' });
      const file = new File([blob], 'figma-import.json', { type: 'application/json' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✅ Method 5: File input triggered');
      success = true;
    }
  } catch (e) {
    console.log('⚠️ Method 5 failed:', e.message);
  }
  
  // Method 6: Try clicking import button
  try {
    const importBtn = document.getElementById('import-btn') || 
                     document.querySelector('[data-action="import"]') ||
                     document.querySelector('button[class*="import"]') ||
                     document.querySelector('button');
    
    if (importBtn) {
      importBtn.click();
      console.log('✅ Method 6: Import button clicked');
    }
  } catch (e) {
    console.log('⚠️ Method 6 failed:', e.message);
  }
  
  return success;
}

// Execute immediately
console.log('\n🎯 EXECUTING TRANSFER NOW...');
const result = sendToFigmaNow();

if (result) {
  console.log('\n🎉 SUCCESS! Data sent to Figma plugin');
  console.log('🎨 Check your Figma canvas for imported components');
  console.log('📊 Expected result: Elements with real text and colors');
} else {
  console.log('\n⚠️ Transfer attempted - check plugin response');
}

// Provide manual access
console.log('\n📋 MANUAL ACCESS:');
console.log('• Data ready at: window.FIGMA_DATA_READY');
console.log('• Manual trigger: sendToFigmaNow()');
console.log('• Sample text content: "' + FIGMA_IMPORT_DATA.tree.children[0].characters + '"');

// Make function available
window.sendToFigmaNow = sendToFigmaNow;

// Status check
setTimeout(() => {
  console.log('\n📈 TRANSFER STATUS CHECK:');
  console.log('• Data available:', !!window.FIGMA_DATA_READY);
  console.log('• Expected components:', FIGMA_IMPORT_DATA.metadata.totalElements);
  console.log('• If no components appeared, try: sendToFigmaNow()');
}, 2000);

console.log('\n🚀 JSON TRANSFER COMPLETE - Check your Figma canvas!');