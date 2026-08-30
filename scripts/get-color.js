const fs = require('fs');
const { PNG } = require('pngjs');
const path = require('path');

const srcPath = path.join(__dirname, '../public/mainlogo.png');

if (fs.existsSync(srcPath)) {
  fs.createReadStream(srcPath)
    .pipe(new PNG())
    .on('parsed', function() {
      const colors = {};
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = (this.width * y + x) << 2;
          const r = this.data[idx];
          const g = this.data[idx + 1];
          const b = this.data[idx + 2];
          const a = this.data[idx + 3];

          // Look for non-transparent, non-white pixels
          if (a > 200 && (r < 240 || g < 240 || b < 240)) {
            const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
            colors[hex] = (colors[hex] || 0) + 1;
          }
        }
      }
      
      const sortedColors = Object.entries(colors).sort((a, b) => b[1] - a[1]);
      console.log('Top colors:', sortedColors.slice(0, 10));
    })
    .on('error', (err) => {
        console.error('Error parsing PNG:', err);
    });
} else {
  console.log('mainlogo.png not found in public folder');
}
