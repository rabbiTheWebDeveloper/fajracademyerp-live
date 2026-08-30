const fs = require('fs');
const { PNG } = require('pngjs');

const inputPath = 'C:\\Users\\LifeSpring-05\\.gemini\\antigravity-ide\\brain\\9c16de9f-df35-4cf9-9dd7-e32c8efcebcf\\.user_uploaded\\media_1787463696137.png';
const fileBuffer = fs.readFileSync(inputPath);
const srcPng = PNG.sync.read(fileBuffer);

let minX = srcPng.width, minY = srcPng.height, maxX = 0, maxY = 0;
let whiteCount = 0;

for (let y = 0; y < srcPng.height; y++) {
  for (let x = 0; x < srcPng.width; x++) {
    const idx = (srcPng.width * y + x) << 2;
    const r = srcPng.data[idx];
    const g = srcPng.data[idx + 1];
    const b = srcPng.data[idx + 2];

    // White box pixels (R > 200, G > 200, B > 200)
    if (r > 200 && g > 200 && b > 200) {
      whiteCount++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log(`White box count: ${whiteCount}`);
console.log(`White banner bounds: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);

// Now within the white banner, where are the dark letters/logo?
let logoMinX = maxX, logoMinY = maxY, logoMaxX = minX, logoMaxY = minY;
for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
    const idx = (srcPng.width * y + x) << 2;
    const r = srcPng.data[idx];
    const g = srcPng.data[idx + 1];
    const b = srcPng.data[idx + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Dark pixels inside the white banner
    if (lum < 150) {
      if (x < logoMinX) logoMinX = x;
      if (x > logoMaxX) logoMaxX = x;
      if (y < logoMinY) logoMinY = y;
      if (y > logoMaxY) logoMaxY = y;
    }
  }
}

console.log(`Actual logo inside banner: x=[${logoMinX}, ${logoMaxX}], y=[${logoMinY}, ${logoMaxY}]`);
