// Simple icon creator for CipherNode PWA
// This creates basic PNG icons using Canvas (if available in Node.js environment)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple base64 encoded PNG for each size
function createIconData(size) {
    // This is a simple 1x1 pixel PNG in base64 that we'll use as a placeholder
    // In a real scenario, you'd use a proper image processing library like sharp or canvas
    const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // For now, we'll create a simple colored square using SVG converted to PNG
    const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#00ff88;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#00ff88;stop-opacity:0" />
        </radialGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="#0a0a0f"/>
      
      <!-- Glow effect -->
      <rect width="${size}" height="${size}" fill="url(#glow)"/>
      
      <!-- Border -->
      <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" 
            fill="none" stroke="#00ff88" stroke-width="${size * 0.02}" rx="${size * 0.04}"/>
      
      <!-- Circuit pattern -->
      <!-- Horizontal line -->
      <line x1="${size * 0.2}" y1="${size * 0.5}" x2="${size * 0.8}" y2="${size * 0.5}" 
            stroke="#00ff88" stroke-width="${size * 0.03}" stroke-linecap="round"/>
      
      <!-- Vertical line -->
      <line x1="${size * 0.5}" y1="${size * 0.2}" x2="${size * 0.5}" y2="${size * 0.8}" 
            stroke="#00ff88" stroke-width="${size * 0.03}" stroke-linecap="round"/>
      
      <!-- Corner nodes -->
      <circle cx="${size * 0.3}" cy="${size * 0.3}" r="${size * 0.04}" fill="#00ff88"/>
      <circle cx="${size * 0.7}" cy="${size * 0.3}" r="${size * 0.04}" fill="#00ff88"/>
      <circle cx="${size * 0.3}" cy="${size * 0.7}" r="${size * 0.04}" fill="#00ff88"/>
      <circle cx="${size * 0.7}" cy="${size * 0.7}" r="${size * 0.04}" fill="#00ff88"/>
      
      <!-- Center node -->
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.06}" fill="#00ff88"/>
      <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.04}" fill="#ffffff"/>
    </svg>`;
    
    return svgIcon;
}

// Create icon files
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icons for each size
sizes.forEach(size => {
    const svgContent = createIconData(size);
    const filename = `icon-${size}x${size}.svg`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    console.log(`Created ${filename}`);
});

// Create a simple favicon.ico placeholder
const faviconSVG = createIconData(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSVG);

console.log('\n✅ PWA icons created successfully!');
console.log('📝 Note: These are SVG icons. For production, consider converting to PNG using a tool like:');
console.log('   - sharp (npm package)');
console.log('   - ImageMagick');
console.log('   - Online SVG to PNG converter');
console.log('\n🌐 You can also open public/icons/generate-icons.html in a browser to generate PNG icons.');

// Create a simple README for icons
const iconReadme = `# CipherNode PWA Icons

This directory contains the icons for the CipherNode Progressive Web App.

## Icon Sizes
- 72x72: Android Chrome
- 96x96: Android Chrome, Windows
- 128x128: Chrome Web Store
- 144x144: Windows tiles
- 152x152: iOS Safari
- 192x192: Android Chrome
- 384x384: Android Chrome
- 512x512: Android Chrome, splash screens

## Generating PNG Icons
1. Open generate-icons.html in a web browser
2. Click "Download" for each icon size
3. Replace the SVG files with PNG files

## Icon Requirements
- Background: #0a0a0f (dark)
- Primary color: #00ff88 (green)
- Style: Circuit/tech theme
- Format: PNG recommended for production
- Maskable: Icons should work with adaptive icon masks
`;

fs.writeFileSync(path.join(iconsDir, 'README.md'), iconReadme);
console.log('📄 Created icons/README.md');