#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--baseline':
      case '-b':
        args.baseline = next;
        i++;
        break;
      case '--candidate':
      case '-c':
        args.candidate = next;
        i++;
        break;
      case '--diff':
      case '-d':
        args.diff = next;
        i++;
        break;
      case '--threshold':
      case '-t':
        args.threshold = parseFloat(next);
        i++;
        break;
      default:
        break;
    }
  }
  return args;
}

function readPng(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.pipe(
      new PNG({ filterType: 4 })
        .on('parsed', function parsed() {
          resolve(this);
        })
        .on('error', reject)
    );
  });
}

async function run() {
  const args = parseArgs(process.argv);
  if (!args.baseline || !args.candidate) {
    console.error(
      'Usage: node tools/validation/pixel-diff.js --baseline baseline.png --candidate candidate.png [--diff diff.png] [--threshold 0.1]'
    );
    process.exit(1);
  }

  const baselinePath = path.resolve(args.baseline);
  const candidatePath = path.resolve(args.candidate);
  const diffPath = args.diff ? path.resolve(args.diff) : undefined;
  const threshold = Number.isFinite(args.threshold) ? args.threshold : 0.1;

  if (!fs.existsSync(baselinePath) || !fs.existsSync(candidatePath)) {
    console.error('Baseline or candidate image not found.');
    process.exit(1);
  }

  const [baseline, candidate] = await Promise.all([readPng(baselinePath), readPng(candidatePath)]);

  if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
    console.error('Images must have identical dimensions for comparison.');
    process.exit(1);
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPixels = pixelmatch(
    baseline.data,
    candidate.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold }
  );

  const totalPixels = baseline.width * baseline.height;
  const diffPercent = (diffPixels / totalPixels) * 100;

  console.log(
    `Pixel diff: ${diffPixels} (${diffPercent.toFixed(2)}%) using threshold ${threshold}`
  );

  if (diffPath) {
    diff.pack().pipe(fs.createWriteStream(diffPath));
    console.log(`Diff image written to ${diffPath}`);
  }

  if (diffPixels > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Pixel diff failed:', error);
  process.exit(1);
});
