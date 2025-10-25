# Manual Import Instructions (When Handoff Server Doesn't Work)

## ⚠️ Why Are All Lights Red?

**Figma plugins cannot use the `fetch` API** to connect to localhost servers due to security sandboxing.

This means:
- ❌ Handoff server polling doesn't work
- ❌ Auto-import from server doesn't work
- ✅ **Manual file import DOES work!**

---

## ✅ Manual Import Steps

### 1. Locate the Test File

The test JSON is ready at:
```
/Users/skirk92/html2figma/test-figma-plugin.json
```

### 2. Import in Figma Plugin

**In the Figma Plugin UI:**

1. Click **"📁 Choose JSON File"** button
2. Navigate to: `/Users/skirk92/html2figma/`
3. Select: **`test-figma-plugin.json`**
4. Make sure **"Apply Auto Layout"** is ✅ CHECKED
5. Click **"Import to Figma"** button

### 3. Watch the Import

You should see:
- Progress bar: 0% → 100%
- Status: "Successfully imported X elements!"
- Stats showing element count

### 4. Check Your Canvas

Look for the new page:
- **"Test Page - Basic Components - 1200px"**

---

## 🎯 What You Should See After Import

### Visual Check:
- ✅ Blue header with "Test Website" logo
- ✅ Purple gradient hero section
- ✅ 3 white cards with colored icons (Blue, Green, Orange)

### Auto Layout Check:
- ✅ Select any frame → Look for **⟳ icon**
- ✅ Try resizing frames → They should respond properly

### Text Check:
- ✅ Double-click any text → Should be editable
- ✅ Font should be Inter

---

## 🔄 Alternative: Copy JSON Directly

If file picker doesn't work, you can copy the JSON:

1. Open `test-figma-plugin.json` in a text editor
2. Copy all contents (Cmd+A, Cmd+C)
3. In Figma plugin... (wait, this method isn't implemented)

Actually, **just use the file picker method above** ☝️

---

## 🚀 For Real Website Captures

When using Puppeteer to capture real websites:

### Step 1: Run Puppeteer
```bash
npm run capture https://github.com/features
```

This creates a JSON file like:
```
capture-2025-10-25T08-35-46-241Z.json
```

### Step 2: Manual Import
1. In Figma plugin: Click "📁 Choose JSON File"
2. Select the capture file
3. Check "Apply Auto Layout" ✅
4. Click "Import to Figma"

---

## 💡 Why Not Use the Handoff Server?

The handoff server is designed for **Chrome Extension → Figma** workflow, where:
- Chrome extension sends data to server
- Figma plugin polls server for data

**But** this requires the Figma plugin to make HTTP requests, which is blocked by Figma's sandbox.

### Solutions:

1. ✅ **Manual import** (works always)
2. 🔧 **Future**: Build a Figma plugin UI that uses `iframe` with network access
3. 🔧 **Future**: Use Figma's plugin messaging API with a helper browser extension

For now, **manual import is the reliable method**!

---

## 📋 Quick Checklist

Before importing:
- [ ] File exists: `test-figma-plugin.json`
- [ ] Figma plugin is open
- [ ] "Apply Auto Layout" is checked ✅

During import:
- [ ] Progress bar shows activity
- [ ] No error messages appear

After import:
- [ ] New page appears in Figma
- [ ] Frames have Auto Layout (⟳ icon)
- [ ] Text is editable
- [ ] Colors match design

---

## 🎉 Expected Result

If everything works:
```
✅ Page created: "Test Page - Basic Components - 1200px"
✅ 22-25 elements imported
✅ Auto Layout enabled on frames
✅ All text editable
✅ Shadows visible
✅ Colors correct
```

**You're ready to test with real websites!** 🚀
