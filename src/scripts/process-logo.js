const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\LifeSpring-05\\.gemini\\antigravity-ide\\brain\\9c16de9f-df35-4cf9-9dd7-e32c8efcebcf\\.user_uploaded\\media_1787463696137.png';
const outNavyPath = path.join(__dirname, '../../public/fajr-logo.png');
const outLogoPath = path.join(__dirname, '../../public/logo.png');
const outWhitePath = path.join(__dirname, '../../public/fajr-logo-white.png');
const outAcademyPath = path.join(__dirname, '../../public/fajr-academy-logo.png');
const outIconPath = path.join(__dirname, '../../public/icon.png');

console.log("Reading raw logo synchronously from:", inputPath);

const fileBuffer = fs.readFileSync(inputPath);
const srcPng = PNG.sync.read(fileBuffer);
console.log(`Original dimensions: ${srcPng.width} x ${srcPng.height}`);

// Step 1: Find true content bounding box (ignore peripheral 5% border if noise)
let minX = srcPng.width, minY = srcPng.height, maxX = 0, maxY = 0;

for (let y = 0; y < srcPng.height; y++) {
  for (let x = 0; x < srcPng.width; x++) {
    const idx = (srcPng.width * y + x) << 2;
    const r = srcPng.data[idx];
    const g = srcPng.data[idx + 1];
    const b = srcPng.data[idx + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Actual logo text & symbol is dark navy (lum < 180)
    if (lum < 210) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log(`True content bounding box: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);

// Add clean padding
const padX = 20;
const padY = 16;
minX = Math.max(0, minX - padX);
minY = Math.max(0, minY - padY);
maxX = Math.min(srcPng.width - 1, maxX + padX);
maxY = Math.min(srcPng.height - 1, maxY + padY);

const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
console.log(`Final cropped dimensions: ${cropW} x ${cropH}`);

// Create Transparent Navy Logo
const navyPng = new PNG({ width: cropW, height: cropH });
// Create Transparent White/Gold Logo
const whitePng = new PNG({ width: cropW, height: cropH });

for (let y = 0; y < cropH; y++) {
  for (let x = 0; x < cropW; x++) {
    const srcIdx = (srcPng.width * (y + minY) + (x + minX)) << 2;
    const dstIdx = (cropW * y + x) << 2;

    const r = srcPng.data[srcIdx];
    const g = srcPng.data[srcIdx + 1];
    const b = srcPng.data[srcIdx + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha = 0;
    if (lum < 235) {
      // Smooth alpha curve for crisp anti-aliased edges
      alpha = Math.round(Math.max(0, Math.min(255, Math.pow((235 - lum) / 225, 0.9) * 255)));
    }

    // Navy Logo: Deep Brand Navy #0A1931
    navyPng.data[dstIdx] = 10;     // R
    navyPng.data[dstIdx + 1] = 25; // G
    navyPng.data[dstIdx + 2] = 49; // B
    navyPng.data[dstIdx + 3] = alpha;

    // White/Ivory Logo: #F8F6F0 (for dark backgrounds)
    whitePng.data[dstIdx] = 248;   // R
    whitePng.data[dstIdx + 1] = 246; // G
    whitePng.data[dstIdx + 2] = 240; // B
    whitePng.data[dstIdx + 3] = alpha;
  }
}

// Write outputs using PNG.sync.write
const navyBuffer = PNG.sync.write(navyPng);
const whiteBuffer = PNG.sync.write(whitePng);

fs.writeFileSync(outNavyPath, navyBuffer);
console.log('Saved transparent navy logo to:', outNavyPath);

fs.writeFileSync(outLogoPath, navyBuffer);
console.log('Saved transparent logo.png to:', outLogoPath);

fs.writeFileSync(outAcademyPath, navyBuffer);
console.log('Saved transparent fajr-academy-logo.png to:', outAcademyPath);

fs.writeFileSync(outWhitePath, whiteBuffer);
console.log('Saved transparent white logo to:', outWhitePath);

fs.writeFileSync(outIconPath, navyBuffer);
console.log('Saved icon.png to:', outIconPath);

console.log("All transparent logo variants created successfully!");
