#!/usr/bin/env node
// node stills.js <video.mp4> <out-dir> <seconds> [seconds...]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const src = path.join(__dirname, 'stills.swift');
const bin = path.join(__dirname, '.bin', 'stills');
if (!fs.existsSync(bin) || fs.statSync(bin).mtimeMs < fs.statSync(src).mtimeMs) {
  fs.mkdirSync(path.dirname(bin), { recursive: true });
  execFileSync('swiftc', ['-O', '-suppress-warnings', src, '-o', bin], { stdio: 'inherit' });
}
execFileSync(bin, process.argv.slice(2), { stdio: 'inherit' });
