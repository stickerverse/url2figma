## Visual Fidelity Validation

Use the pixel-diff utility to compare a baseline screenshot against a Figma export.

```bash
# Capture the source web page screenshot manually or via automation
# Export the corresponding Figma frame as PNG

npm run validate:pixels -- \\
  --baseline artifacts/source.png \\
  --candidate artifacts/figma.png \\
  --diff artifacts/diff.png \\
  --threshold 0.1
```

- `baseline`: reference image captured from the browser (PNG).
- `candidate`: image exported from the generated Figma design (PNG).
- `diff` (optional): writes a heatmap highlighting pixel differences.
- `threshold`: sets the pixelmatch sensitivity (default 0.1).

The command exits with a non-zero status when differences are detected, making it suitable for CI or automated regression checks.
