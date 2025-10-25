# Test Import Guide

## ❌ Problem Found & ✅ Fixed

### The Error:
```
Property "fills" failed validation: Unrecognized key(s) in object: 'a' at [0].color
```

### Root Cause:
Figma's color format doesn't accept an `a` (alpha) property inside color objects.

**WRONG Format:**
```json
{
  "type": "SOLID",
  "color": { "r": 0.98, "g": 0.98, "b": 0.98, "a": 1 },
  "opacity": 1
}
```

**CORRECT Format:**
```json
{
  "type": "SOLID",
  "color": { "r": 0.98, "g": 0.98, "b": 0.98 },
  "opacity": 1
}
```

### The Fix:
✅ Removed all `a` properties from color objects throughout the JSON
✅ Opacity is now handled only via the `opacity` property on fills
✅ Updated: `test-figma-plugin.json`

---

## 🚀 Quick Test

### Option 1: Using the Script
```bash
./test-import.sh
```

### Option 2: Manual Send
```bash
curl -X POST http://127.0.0.1:4411/jobs \
  -H "Content-Type: application/json" \
  -d @test-figma-plugin.json
```

### Option 3: Direct Figma Plugin Upload
1. Open Figma plugin
2. Click "📁 Choose JSON File"
3. Select `test-figma-plugin.json`
4. Ensure "Apply Auto Layout" is checked ✅
5. Click "Import to Figma"

---

## 🎯 What You Should See

### Page Created:
**"Test Page - Basic Components - 1200px"**

### Layout Structure:
```
Page Container (1200x800) [Auto Layout ⟳]
│
├── Header (Blue) [Auto Layout ⟳ Horizontal]
│   ├── "Test Website" (Logo text)
│   └── Navigation [Auto Layout ⟳]
│       ├── Home
│       ├── About
│       └── Contact
│
├── Hero Section (Gradient) [Auto Layout ⟳ Vertical]
│   ├── "Welcome to Our Test Page" (Title)
│   └── "Testing Figma plugin..." (Subtitle)
│
└── Cards Container [Auto Layout ⟳ Horizontal]
    ├── Card 1 (Blue icon) - "Auto Layout"
    ├── Card 2 (Green icon) - "Components"
    └── Card 3 (Orange icon) - "Editable Text"
```

---

## ✅ Verification Checklist

After import, verify these features:

### 1. Auto Layout (Most Important!)
- [ ] Select "Page Container" → Look for **⟳ Auto Layout icon**
- [ ] Select "Header" → Auto Layout mode: **HORIZONTAL**
- [ ] Select "Hero Section" → Auto Layout mode: **VERTICAL**
- [ ] Select "Cards Container" → Auto Layout mode: **HORIZONTAL**
- [ ] Cards should have **24px spacing** between them

### 2. Editable Text
- [ ] Double-click "Test Website" → Cursor appears, text is editable
- [ ] Double-click hero title → Text is editable
- [ ] Double-click any card description → Text is editable
- [ ] Font family should be **Inter** (various weights)

### 3. Colors & Fills
- [ ] Header: **Blue background** (#6678F2 / rgb(102, 120, 242))
- [ ] Hero: **Gradient background** (blue → purple)
- [ ] Card 1 icon: **Blue** square
- [ ] Card 2 icon: **Green** square
- [ ] Card 3 icon: **Orange** square
- [ ] Page background: **Light gray** (#FAFAFA)

### 4. Effects & Shadows
- [ ] Header has **subtle drop shadow** (visible on bottom edge)
- [ ] All 3 cards have **drop shadows** (visible when you zoom in)

### 5. Spacing & Padding
- [ ] Page container: **40px padding** on all sides
- [ ] Header: **24px horizontal padding**, **16px vertical padding**
- [ ] Cards: **24px padding** inside each card
- [ ] Card content: **12px spacing** between icon, title, and description

### 6. Corner Radius
- [ ] Header: **8px** rounded corners
- [ ] Hero section: **12px** rounded corners
- [ ] Cards: **8px** rounded corners
- [ ] Card icons: **8px** rounded corners

### 7. Resizing (Auto Layout Test)
- [ ] Resize hero section wider → Text stays **centered**
- [ ] Resize cards container → Cards maintain **spacing**
- [ ] Try deleting a nav item → Other items **auto-adjust**

---

## 📊 Expected Import Stats

- **Total Elements**: ~22-25 nodes
- **Frames**: 8-10 frames (including nested)
- **Text Nodes**: 8 editable text elements
- **Shapes**: 3 rectangles (card icons)
- **Auto Layout Frames**: 6 frames with Auto Layout enabled

---

## 🐛 If Import Still Fails

### Check Figma Plugin Console:
1. In Figma Desktop: **Plugins → Development → Open Console**
2. Look for red error messages
3. Share the error with me

### Common Issues:

**Issue**: "No elements imported"
- **Check**: Make sure handoff server is running
- **Check**: Look at Figma plugin status lights (should be green)

**Issue**: "Text appears but can't edit"
- **Likely**: Font loading issue
- **Fix**: Inter font should be available, but check Figma can access it

**Issue**: "No Auto Layout icons visible"
- **Check**: "Apply Auto Layout" was checked during import
- **Try**: Re-import with the option enabled

**Issue**: "Colors are wrong"
- **Check**: Make sure you're using the FIXED `test-figma-plugin.json`
- **Verify**: File should NOT have `"a": 1` in any color objects

---

## 🔧 Files Created

| File | Purpose |
|------|---------|
| `test-figma-plugin.json` | ✅ Fixed test data (use this!) |
| `test-import.sh` | Quick test script |
| `TEST-IMPORT-README.md` | This guide |

---

## 📝 Next Steps After Successful Test

Once the test import works:

1. **Test with real websites:**
   ```bash
   npm run capture https://github.com/features
   npm run capture https://stripe.com/pricing
   ```

2. **Verify Auto Layout on real sites:**
   - Check that flexbox layouts convert properly
   - Verify spacing and alignment
   - Test resizing behavior

3. **Test component detection:**
   - Real sites have repeated UI patterns
   - Should create Figma components automatically

4. **Test with complex designs:**
   - Gradients, shadows, effects
   - Images and SVG icons
   - Responsive layouts

---

## ✨ Success!

If you can see the test page in Figma with:
- ✅ Editable text
- ✅ Auto Layout enabled (⟳ icons)
- ✅ Correct colors
- ✅ Proper spacing

**Your Figma plugin is working correctly!** 🎉

You're ready to import real websites!
