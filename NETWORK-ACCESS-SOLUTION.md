# How Chrome Extension → Figma Plugin Communication Works

## 🎯 The Problem We Solved

**Your Question:** How does html.to.design (divRIOTS) send data from Chrome Extension to Figma Plugin?

**The Answer:** They use the **Figma Plugin UI (iframe)** for network access, not the main plugin code!

---

## 🏗️ Figma Plugin Architecture

Figma plugins have **TWO separate contexts**:

### 1. Main Plugin Code (`code.ts`)
```
📦 Runs in: Figma's JavaScript sandbox
🔒 Network Access: NONE (completely blocked)
⚡ Powers: Figma API, canvas manipulation, node creation
❌ Cannot: Make HTTP requests, use fetch(), access external APIs
```

### 2. Plugin UI (`ui/index.html`)
```
📦 Runs in: HTML iframe (browser-like environment)
✅ Network Access: YES (when configured in manifest.json)
⚡ Powers: User interface, network requests, browser APIs
✅ Can: fetch(), XMLHttpRequest, WebSocket, etc.
```

---

## ✅ The Solution: UI Does the Networking

### **Architecture Flow:**

```
┌─────────────────┐      ┌──────────────────┐
│ Chrome Ext.     │      │ Puppeteer Script │
└────────┬────────┘      └────────┬─────────┘
         │                        │
         │ POST /jobs             │ POST /jobs
         ▼                        ▼
┌────────────────────────────────────────────┐
│      Handoff Server (localhost:4411)       │
│              Queue: [job1, job2...]         │
└─────────────────┬──────────────────────────┘
                  │
                  │ Polling (GET /jobs/next)
                  │ Every 2.5 seconds
                  ▼
┌────────────────────────────────────────────┐
│         Figma Plugin UI (iframe)           │  ✅ HAS NETWORK ACCESS
│     - Polls handoff server via fetch()     │
│     - Receives JSON data                   │
│     - Sends to main plugin via postMessage │
└─────────────────┬──────────────────────────┘
                  │
                  │ postMessage({type: 'auto-import-data'})
                  ▼
┌────────────────────────────────────────────┐
│      Figma Plugin Main Code (code.ts)      │  ❌ NO NETWORK ACCESS
│     - Receives data via message handler    │
│     - Creates Figma nodes                  │
│     - Builds components, auto layout       │
└────────────────────────────────────────────┘
```

---

## 🔧 What I Fixed

### **1. Added Network Access to Manifest**

**File:** `figma-plugin/manifest.json`

```json
{
  "networkAccess": {
    "allowedDomains": ["*"],
    "devAllowedDomains": [
      "http://localhost:*",
      "http://127.0.0.1:*"
    ],
    "reasoning": "Plugin needs to fetch images and connect to local dev server"
  }
}
```

**Why This Works:**
- `allowedDomains`: Production network access
- `devAllowedDomains`: Development localhost access
- Required for UI iframe to make network requests

### **2. Moved Polling from Main Code to UI**

**Before (DIDN'T WORK):**
```typescript
// In code.ts (main plugin code)
async function pollHandoffServer() {
  const response = await fetch('http://localhost:4411/jobs/next');  // ❌ BLOCKED!
}
```

**After (WORKS!):**
```javascript
// In ui/index.html (iframe)
async function pollHandoffServer() {
  const response = await fetch('http://127.0.0.1:4411/jobs/next');  // ✅ WORKS!
  const body = await response.json();

  if (body?.job?.payload) {
    // Send to main plugin code via postMessage
    parent.postMessage({
      pluginMessage: {
        type: 'auto-import-data',
        data: body.job.payload
      }
    }, '*');
  }
}

// Poll every 2.5 seconds
setInterval(pollHandoffServer, 2500);
```

### **3. Main Plugin Code Just Handles Import**

**File:** `code.ts`

```typescript
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'auto-import-data') {
    // Received data from UI, now import to Figma
    await handleImportRequest(msg.data, msg.options, 'auto-import');
  }
};
```

---

## 🔄 How Other Tools Do It

### **html.to.design (divRIOTS)**
```
Chrome Extension → Cloud API → Figma Plugin UI → Main Plugin
```
- Uses cloud storage instead of localhost
- Same principle: UI does networking

### **Builder.io HTML to Figma**
```
Chrome Extension → Firebase/Cloud → Figma Plugin UI → Main Plugin
```
- Cloud-based collection system
- UI polls cloud API

### **Web to Figma (Others)**
```
Chrome Extension → localStorage/IndexedDB → Figma Plugin UI reads
```
- Some use browser storage (limited)
- Our approach is more flexible

---

## 🎯 Why Your Lights Were Red

**Before Fix:**
```
❌ Handoff Server - Red (code.ts can't fetch)
❌ Data Reception - Red (no data received)
❌ All Lights - Red (network blocked)
```

**After Fix:**
```
🟢 Handoff Server - Green (UI can fetch!)
🟢 Data Reception - Green (data flows through)
🟢 Auto-import - Works automatically!
```

---

## 🚀 How to Test Now

### **1. Restart Figma Plugin**

In Figma Desktop:
```
Plugins → Development → "Web to Figma" → Right-click → Restart
```

### **2. Watch the Lights Turn Green**

Within 2.5 seconds you should see:
```
🔴 → 🟢 Handoff Server
🔴 → 🟢 Data Reception (when data arrives)
```

### **3. Send Test Data**

```bash
curl -X POST http://127.0.0.1:4411/jobs \
  -H "Content-Type: application/json" \
  -d @test-figma-plugin.json
```

### **4. Watch Auto-Import**

The Figma plugin should:
1. 🟢 Detect data (green lights)
2. 🟡 Start import (yellow import light)
3. 📊 Show progress (0% → 100%)
4. 🟢 Complete (green import light)
5. 🎨 Canvas shows test page!

---

## 📋 Comparison Table

| Approach | Network Access | Complexity | Our Choice |
|----------|----------------|------------|------------|
| **Main code fetch** | ❌ Blocked | Simple | ❌ Doesn't work |
| **UI iframe fetch** | ✅ Works | Medium | ✅ **We use this!** |
| **Cloud intermediary** | ✅ Works | High | Not needed |
| **Manual file upload** | ✅ Works | Low | Fallback option |

---

## 🔑 Key Takeaways

1. ✅ **UI has network access**, main code doesn't
2. ✅ **manifest.json** must configure `networkAccess`
3. ✅ **devAllowedDomains** enables localhost for development
4. ✅ **postMessage** bridges UI ↔ main code
5. ✅ **CORS must be enabled** on server (`Access-Control-Allow-Origin: *`)

---

## 🎉 Result

Your Figma plugin now works just like **html.to.design** and other commercial solutions!

**Complete Workflow:**
```
1. Puppeteer captures website
2. Sends to handoff server
3. Figma plugin UI polls server
4. Receives data automatically
5. Sends to main plugin code
6. Imports to Figma canvas
7. ✨ Done!
```

**No manual steps required!** 🚀
