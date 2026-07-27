const fs = require('fs');
const path = require('path');

function cleanBuildDirs(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (let entry of entries) {
        if (entry.isDirectory()) {
            const fullPath = path.join(dir, entry.name);
            
            // Si es un directorio android/build
            if (entry.name === 'build' && path.basename(dir) === 'android') {
                console.log(`Deleting: ${fullPath}`);
                try {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                } catch (e) {
                    console.error(`Failed to delete ${fullPath}:`, e.message);
                }
            } else if (entry.name === '.cxx' && path.basename(dir) === 'android') {
                console.log(`Deleting: ${fullPath}`);
                try {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                } catch (e) {
                    console.error(`Failed to delete ${fullPath}:`, e.message);
                }
            } else {
                // Recursión
                cleanBuildDirs(fullPath);
            }
        }
    }
}

cleanBuildDirs(path.join(__dirname, 'node_modules'));
console.log("Cleanup complete!");
