const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const srcPath = 'C:/Users/LifeSpring-05/.gemini/antigravity-ide/brain/090d53b7-9772-4cbb-8062-a04aca0d167f/.user_uploaded/media_1787553013606.png';

fs.createReadStream(srcPath)
  .pipe(new PNG())
  .on('parsed', function() {
    console.log('Image original size:', this.width, 'x', this.height);

    // 1. Find bounding box of non-white pixels
    let minX = this.width, maxX = 0, minY = this.height, maxY = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];
        const a = this.data[idx + 3];

        // If pixel is not white and has opacity
        if (a > 20 && (r < 245 || g < 245 || b < 245)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Add a balanced padding around the logo content
    const padX = 16;
    const padY = 12;
    const cropX = Math.max(0, minX - padX);
    const cropY = Math.max(0, minY - padY);
    const cropW = Math.min(this.width - cropX, (maxX - minX) + padX * 2);
    const cropH = Math.min(this.height - cropY, (maxY - minY) + padY * 2);

    console.log('Crop box:', { cropX, cropY, cropW, cropH });

    // 2. Create cropped transparent dark logo
    const darkPng = new PNG({ width: cropW, height: cropH });
    // 3. Create cropped transparent white logo
    const whitePng = new PNG({ width: cropW, height: cropH });

    for (let y = 0; y < cropH; y++) {
      for (let x = 0; x < cropW; x++) {
        const srcIdx = (this.width * (cropY + y) + (cropX + x)) << 2;
        const dstIdx = (cropW * y + x) << 2;

        const r = this.data[srcIdx];
        const g = this.data[srcIdx + 1];
        const b = this.data[srcIdx + 2];
        const a = this.data[srcIdx + 3];

        // Calculate lightness: 0 = dark logo stroke, 255 = white background
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
        
        // Alpha based on darkness: if brightness is 255 -> alpha is 0. If brightness is 0 -> alpha is 255.
        // We smooth the transition for anti-aliasing
        let alpha = 0;
        if (brightness < 245) {
          alpha = Math.min(255, Math.max(0, Math.round((245 - brightness) / 245 * 255 * 1.08)));
        }

        // Dark navy version (#0b1931 - rich navy)
        darkPng.data[dstIdx] = Math.round(r * 0.9); // preserve dark tone
        darkPng.data[dstIdx + 1] = Math.round(g * 0.9);
        darkPng.data[dstIdx + 2] = Math.round(b * 0.9);
        darkPng.data[dstIdx + 3] = alpha;

        // Crisp White version with full transparency
        whitePng.data[dstIdx] = 255;
        whitePng.data[dstIdx + 1] = 255;
        whitePng.data[dstIdx + 2] = 255;
        whitePng.data[dstIdx + 3] = alpha;
      }
    }

    // Save to public directory
    const publicDir = path.join(__dirname, 'public');
    darkPng.pack().pipe(fs.createWriteStream(path.join(publicDir, 'fajr-logo.png'))).on('finish', () => {
      console.log('Saved public/fajr-logo.png');
    });

    darkPng.pack().pipe(fs.createWriteStream(path.join(publicDir, 'fajr-academy-logo.png'))).on('finish', () => {
      console.log('Saved public/fajr-academy-logo.png');
    });

    darkPng.pack().pipe(fs.createWriteStream(path.join(publicDir, 'logo.png'))).on('finish', () => {
      console.log('Saved public/logo.png');
    });

    whitePng.pack().pipe(fs.createWriteStream(path.join(publicDir, 'fajr-logo-white.png'))).on('finish', () => {
      console.log('Saved public/fajr-logo-white.png');
    });
  });
