const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');
const version = appJson.expo.version || '1.0.0';

const exportDir = path.join(__dirname, '..', 'export');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// 1. Delete old files in export folder
const existingFiles = fs.readdirSync(exportDir);
for (const file of existingFiles) {
  if (file.endsWith('.apk') || file.endsWith('.aab')) {
    fs.unlinkSync(path.join(exportDir, file));
    console.log(`Deleted old build: ${file}`);
  }
}

// 2. Copy APK
const apkSrc = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const apkDest = path.join(exportDir, `xpress-v${version}.apk`);
if (fs.existsSync(apkSrc)) {
  fs.copyFileSync(apkSrc, apkDest);
  const sizeMb = (fs.statSync(apkDest).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Exported APK: xpress-v${version}.apk (${sizeMb} MB)`);
} else {
  console.error(`❌ APK not found at ${apkSrc}`);
}

// 3. Copy AAB
const aabSrc = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const aabDest = path.join(exportDir, `xpress-v${version}.aab`);
if (fs.existsSync(aabSrc)) {
  fs.copyFileSync(aabSrc, aabDest);
  const sizeMb = (fs.statSync(aabDest).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Exported AAB: xpress-v${version}.aab (${sizeMb} MB)`);
} else {
  console.error(`❌ AAB not found at ${aabSrc}`);
}

console.log("\n🎉 Export complete! Both APK and AAB are ready in the 'export' folder.");
