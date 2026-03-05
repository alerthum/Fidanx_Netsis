const sharp = require('sharp');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, 'public', 'icons');

async function generate() {
    for (const size of sizes) {
        await sharp(svgPath)
            .resize(size, size)
            .png()
            .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
        console.log(`Created: icon-${size}x${size}.png`);
    }
    console.log('All icons generated!');
}

generate().catch(console.error);
