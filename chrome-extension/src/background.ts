chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Web to Figma extension installed');
    
    chrome.storage.local.set({
      serverEndpoint: 'http://localhost:8787/render-yoga',
      captureOptions: {
        captureHoverStates: true,
        captureFocusStates: false,
        detectComponents: true,
        extractSVGs: true,
        captureDepth: 'medium'
      }
    });
  } else if (details.reason === 'update') {
    console.log('Web to Figma extension updated');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  if (message.type === 'CAPTURE_COMPLETE' || 
      message.type === 'CAPTURE_ERROR' || 
      message.type === 'PROGRESS_UPDATE') {
    chrome.runtime.sendMessage(message);
  }
  
  return true;
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
  }
});
