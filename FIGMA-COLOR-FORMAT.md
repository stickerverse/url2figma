# Figma Color Format Rules

## ⚠️ IMPORTANT: Different Color Formats for Different Properties

Figma uses **different** color formats depending on where the color appears!

---

## ✅ FILLS (Backgrounds, Text, Shapes)

**Color objects in fills do NOT include `a` (alpha)**

### Correct Format:
```json
{
  "fills": [
    {
      "type": "SOLID",
      "color": { "r": 0.98, "g": 0.98, "b": 0.98 },  // NO 'a' property!
      "opacity": 1,  // Opacity is separate
      "visible": true
    }
  ]
}
```

### Wrong Format (will fail):
```json
{
  "fills": [
    {
      "type": "SOLID",
      "color": { "r": 0.98, "g": 0.98, "b": 0.98, "a": 1 },  // ❌ 'a' not allowed
      "opacity": 1
    }
  ]
}
```

**Error if wrong:**
```
Property "fills" failed validation: Unrecognized key(s) in object: 'a'
```

---

## ✅ EFFECTS (Shadows, Blurs)

**Color objects in effects MUST include `a` (alpha)**

### Correct Format:
```json
{
  "effects": [
    {
      "type": "DROP_SHADOW",
      "color": { "r": 0, "g": 0, "b": 0, "a": 0.1 },  // 'a' is REQUIRED!
      "offset": { "x": 0, "y": 2 },
      "radius": 8,
      "spread": 0,
      "visible": true,
      "blendMode": "NORMAL"
    }
  ]
}
```

### Wrong Format (will fail):
```json
{
  "effects": [
    {
      "type": "DROP_SHADOW",
      "color": { "r": 0, "g": 0, "b": 0 },  // ❌ Missing 'a'!
      "offset": { "x": 0, "y": 2 },
      "radius": 8
    }
  ]
}
```

**Error if wrong:**
```
Property "effects" failed validation: Required value missing at [0].color.a
```

---

## ✅ STROKES (Borders)

**Color objects in strokes do NOT include `a`** (like fills)

### Correct Format:
```json
{
  "strokes": [
    {
      "type": "SOLID",
      "color": { "r": 0.9, "g": 0.9, "b": 0.9 },  // NO 'a' property
      "opacity": 1,
      "thickness": 1
    }
  ]
}
```

---

## ✅ GRADIENT STOPS

**Color objects in gradient stops do NOT include `a`**

### Correct Format:
```json
{
  "type": "GRADIENT_LINEAR",
  "gradientStops": [
    {
      "position": 0,
      "color": { "r": 0.4, "g": 0.47, "b": 0.95 }  // NO 'a' property
    },
    {
      "position": 1,
      "color": { "r": 0.55, "g": 0.31, "b": 0.93 }  // NO 'a' property
    }
  ],
  "gradientTransform": [[1, 0, 0], [0, 1, 0]]
}
```

---

## 📋 Quick Reference Table

| Property | Color Format | Opacity Handling |
|----------|--------------|------------------|
| **fills** | `{ r, g, b }` | Separate `opacity` property |
| **strokes** | `{ r, g, b }` | Separate `opacity` property |
| **effects** (shadows) | `{ r, g, b, a }` | `a` inside color object |
| **gradientStops** | `{ r, g, b }` | No opacity |
| **textStyle.fills** | `{ r, g, b }` | Separate `opacity` property |

---

## 🔧 How to Fix Your JSON

### For Fills/Strokes (Remove `a`):
```javascript
// If your color has 'a' property
color: { r: 0.98, g: 0.98, b: 0.98, a: 1 }

// Remove it:
delete color.a;

// Result:
color: { r: 0.98, g: 0.98, b: 0.98 }
```

### For Effects (Add `a`):
```javascript
// If your effect color is missing 'a'
effect.color: { r: 0, g: 0, b: 0 }

// Add it:
effect.color.a = 0.1;  // Use appropriate alpha value

// Result:
effect.color: { r: 0, g: 0, b: 0, a: 0.1 }
```

---

## 💡 Why This Design?

Figma separates concerns:

- **Fills/Strokes**: Opacity can be animated independently, so it's a separate property
- **Effects**: Shadow color opacity is part of the shadow definition itself
- **Consistency**: Gradients use simple colors, as they define multiple colors with positions

---

## 🎯 Common Mistakes

### ❌ Mistake 1: Adding `a` to all colors
```json
// DON'T DO THIS:
"fills": [
  {
    "type": "SOLID",
    "color": { "r": 1, "g": 1, "b": 1, "a": 1 }  // ❌ Will fail
  }
]
```

### ❌ Mistake 2: Forgetting `a` in effects
```json
// DON'T DO THIS:
"effects": [
  {
    "type": "DROP_SHADOW",
    "color": { "r": 0, "g": 0, "b": 0 }  // ❌ Missing 'a', will fail
  }
]
```

### ✅ Correct Approach:
```json
{
  "fills": [
    {
      "type": "SOLID",
      "color": { "r": 1, "g": 1, "b": 1 },  // ✅ No 'a'
      "opacity": 1
    }
  ],
  "effects": [
    {
      "type": "DROP_SHADOW",
      "color": { "r": 0, "g": 0, "b": 0, "a": 0.1 },  // ✅ Has 'a'
      "offset": { "x": 0, "y": 2 },
      "radius": 8
    }
  ]
}
```

---

## 🛠️ Validation Script

Use this to validate your JSON:

```javascript
function validateFigmaColors(data) {
  const issues = [];

  function checkNode(node, path) {
    // Check fills - should NOT have 'a'
    if (node.fills) {
      node.fills.forEach((fill, i) => {
        if (fill.color && 'a' in fill.color) {
          issues.push(`${path}.fills[${i}].color should NOT have 'a' property`);
        }
      });
    }

    // Check strokes - should NOT have 'a'
    if (node.strokes) {
      node.strokes.forEach((stroke, i) => {
        if (stroke.color && 'a' in stroke.color) {
          issues.push(`${path}.strokes[${i}].color should NOT have 'a' property`);
        }
      });
    }

    // Check effects - MUST have 'a'
    if (node.effects) {
      node.effects.forEach((effect, i) => {
        if (effect.color && !('a' in effect.color)) {
          issues.push(`${path}.effects[${i}].color MUST have 'a' property`);
        }
      });
    }

    // Recurse to children
    if (node.children) {
      node.children.forEach((child, i) => {
        checkNode(child, `${path}.children[${i}]`);
      });
    }
  }

  checkNode(data.tree, 'tree');
  return issues;
}

// Usage:
const issues = validateFigmaColors(yourData);
if (issues.length > 0) {
  console.error('Color format issues found:', issues);
} else {
  console.log('✅ All colors are correctly formatted!');
}
```

---

## 📚 References

- Fills: No `a` in color, use separate `opacity`
- Strokes: No `a` in color, use separate `opacity`
- Effects: Include `a` in color (0-1 range)
- Gradients: No `a` in gradient stop colors

This is the official Figma Plugin API behavior as of 2025.
