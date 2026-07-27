const fs = require('fs');
const path = require('path');

const iconPath = path.join(__dirname, 'assets', 'icon.png');
const resPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const mipmapFolders = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

const drawableFolders = [
  'drawable-mdpi',
  'drawable-hdpi',
  'drawable-xhdpi',
  'drawable-xxhdpi',
  'drawable-xxxhdpi'
];

for (const folder of mipmapFolders) {
  const dir = path.join(resPath, folder);
  if (fs.existsSync(dir)) {
    fs.copyFileSync(iconPath, path.join(dir, 'ic_launcher.png'));
    fs.copyFileSync(iconPath, path.join(dir, 'ic_launcher_round.png'));
    fs.copyFileSync(iconPath, path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`Updated icons in ${folder}`);
  }
}

for (const folder of drawableFolders) {
  const dir = path.join(resPath, folder);
  if (fs.existsSync(dir)) {
    fs.copyFileSync(iconPath, path.join(dir, 'splashscreen_logo.png'));
    console.log(`Updated splashscreen logo in ${folder}`);
  }
}

console.log("All Android app icons and splash logos updated successfully!");
