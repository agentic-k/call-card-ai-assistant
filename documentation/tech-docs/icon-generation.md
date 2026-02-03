# Icon Generation for Call Card

This document explains how to generate application icons for the Call Card Electron app.

## Overview

The Call Card app uses a custom icon generation system that creates transparent icons for all required sizes and formats. This ensures a consistent look across different platforms and contexts (dock, taskbar, tray, etc.).

## Icon Generation Process

The icon generation process creates:

1. PNG files in various sizes (16x16 to 1024x1024)
2. An ICNS file for macOS
3. All with proper transparency

## How to Generate Icons

### Using the Built-in Script

The easiest way to generate icons is to use the built-in npm script:

```bash
npm run create-icon
```

This will:
1. Generate PNG icons in various sizes (16x16 to 1024x1024)
2. Create an ICNS file for macOS
3. Place all icons in the correct locations

### Icon Locations

After generation, the icons will be placed in:

- `public/icons/png/` - PNG files in various sizes
- `public/icons/mac/icon.icns` - ICNS file for macOS
- `public/icon.png` - Copy of the largest PNG file
- `public/icon.icns` - Copy of the ICNS file

### Customizing the Icon

If you want to customize the icon, you can modify the `create-transparent-icon.js` script in the `scripts` directory. The script uses SVG to generate the icon, which allows for easy customization.

Key parameters you might want to change:

```javascript
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
```

You can modify:
- `bgColor` - The background color of the icon
- `fgColor` - The text color
- The SVG content itself to create a completely different design

## Using Icons in Development

When running the app in development mode, the icons are automatically loaded from the correct locations. The main process has built-in logic to find and use the appropriate icon files.

To run the app in development mode:

```bash
npm run dev:electron
```

## Using Icons in Production

For production builds, the icons are automatically included in the packaged app. The configuration is set in:

1. `forge.config.mjs` - For Electron Forge packaging
2. `electron-builder.config.cjs` - For Electron Builder packaging

Both configurations point to the correct icon locations:

```javascript
// In forge.config.mjs
icon: path.join(__dirname, 'public/icons/icon')

// In electron-builder.config.cjs
mac: {
  target: ["dmg", "zip"],
  icon: "public/icons/icon.icns",
  // ...
}
```

## Troubleshooting

If you encounter issues with the icons:

1. Make sure the Sharp dependency is installed:
   ```bash
   npm install --save-dev sharp
   ```

2. Check that the icon files exist in the expected locations:
   ```bash
   ls -la public/icons/png/
   ls -la public/icons/mac/
   ```

3. For macOS ICNS generation issues, make sure `iconutil` is available (it's included with macOS).

4. If icons aren't showing up correctly, you can regenerate them:
   ```bash
   npm run create-icon
   ```

## Dependencies

The icon generation script uses:

- Sharp - For image processing
- Node.js built-in modules (fs, path)
- macOS `iconutil` command (for ICNS generation on macOS) 