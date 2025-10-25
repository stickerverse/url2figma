const fs = require('fs');
const data = JSON.parse(fs.readFileSync('test-figma-plugin.json', 'utf8'));

// Recursive function to fix effects - add 'a' back to effect colors
function fixEffects(obj) {
  if (!obj) return;
  if (typeof obj !== 'object') return;

  // If this is an effects array
  if (obj.effects && Array.isArray(obj.effects)) {
    obj.effects.forEach(effect => {
      if (effect.color && !('a' in effect.color)) {
        // Add alpha back to effect colors
        // For drop shadows, use 0.1 alpha by default
        effect.color.a = 0.1;
      }
    });
  }

  // Recurse through all properties
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      fixEffects(obj[key]);
    }
  }
}

fixEffects(data);
fs.writeFileSync('test-figma-plugin.json', JSON.stringify(data, null, 2));
console.log('✅ Fixed effects format - added alpha to shadow colors');
