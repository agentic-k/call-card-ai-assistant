// create-transparent-icon.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define directories
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const pngDir = path.join(iconsDir, 'png');
const macDir = path.join(iconsDir, 'mac');

// Create directories if they don't exist
[iconsDir, pngDir, macDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Define icon colors
const bgColor = '#0D3B4A'; // Dark teal background
const fgColor = '#5CFFB7';  // Light teal text

// Create an SVG icon with transparency
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" rx="${size * 0.15}" fill="${bgColor}" />
  <text x="${size / 2}" y="${size / 2 + size * 0.15}" 
        font-family="Courier, monospace" font-size="${size * 0.4}" 
        fill="${fgColor}" text-anchor="middle" font-weight="bold">
    [C]
  </text>
</svg>
`;

// PNG sizes to generate
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function generateTransparentIcons() {
  try {
    console.log('Generating transparent icons...');
    
    // Generate PNG files with transparency for each size
    for (const size of sizes) {
      const outputPath = path.join(pngDir, `${size}x${size}.png`);
      const svgBuffer = Buffer.from(createSvg(size));
      
      await sharp(svgBuffer)
        .png({ 
          quality: 100,
          compressionLevel: 9
        })
        .toFile(outputPath);
    }

    // Copy the largest size as the main icon.png
    const largestPng = path.join(pngDir, `1024x1024.png`);
    const mainIconPath = path.join(__dirname, '..', 'public', 'icon.png');
    fs.copyFileSync(largestPng, mainIconPath);

    // Generate ICNS file for macOS using the PNG files
    if (process.platform === 'darwin') {
      try {
        // Create temporary iconset directory
        const iconsetDir = path.join(iconsDir, 'icon.iconset');
        if (fs.existsSync(iconsetDir)) {
          fs.rmSync(iconsetDir, { recursive: true, force: true });
        }
        fs.mkdirSync(iconsetDir, { recursive: true });
        
        // Copy PNG files to iconset with the required naming convention
        const iconsetSizes = [16, 32, 128, 256, 512, 1024];
        for (const size of iconsetSizes) {
          const pngPath = path.join(pngDir, `${size}x${size}.png`);
          
          // Normal resolution
          fs.copyFileSync(pngPath, path.join(iconsetDir, `icon_${size}x${size}.png`));
          
          // High resolution (2x) - use the next size up or the same if it's the largest
          const doubleSize = size * 2;
          const highResSize = iconsetSizes.find(s => s >= doubleSize) || size;
          const highResPngPath = path.join(pngDir, `${highResSize}x${highResSize}.png`);
          
          if (fs.existsSync(highResPngPath) && size < 512) { // Don't create 2x for 512 and 1024
            fs.copyFileSync(highResPngPath, path.join(iconsetDir, `icon_${size}x${size}@2x.png`));
          }
        }
        
        // Convert iconset to icns
        const icnsPath = path.join(macDir, 'icon.icns');
        execSync(`iconutil -c icns -o "${icnsPath}" "${iconsetDir}"`);
        
        // Copy to public directory as well
        const publicIcnsPath = path.join(__dirname, '..', 'public', 'icon.icns');
        fs.copyFileSync(icnsPath, publicIcnsPath);
        
        // Clean up
        fs.rmSync(iconsetDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Error generating ICNS file:', error);
      }
    }

    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating transparent icons:', error);
  }
}

generateTransparentIcons(); 