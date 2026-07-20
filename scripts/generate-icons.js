import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const svgPath = path.join(publicDir, 'icon.svg');

const targets = [
  { name: 'apple-touch-icon-v5.png', size: 180 },
  { name: 'icon-192-v5.png', size: 192 },
  { name: 'icon-512-v5.png', size: 512 }
];

async function generate() {
  console.log('Generating PNG icons from SVG...');
  for (const target of targets) {
    const destPath = path.join(publicDir, target.name);
    try {
      const buffer = await sharp(svgPath)
        .resize(target.size, target.size)
        .png()
        .toBuffer();
      
      const firstBytes = buffer.subarray(0, 8).toString('hex');
      console.log(`Buffer for ${target.name} first bytes (hex):`, firstBytes);
      
      fs.writeFileSync(destPath, buffer);
      console.log(`Generated and wrote ${target.name} (${target.size}x${target.size})`);
    } catch (err) {
      console.error(`Error generating ${target.name}:`, err);
    }
  }
  console.log('Done generating icons!');
}

generate();

