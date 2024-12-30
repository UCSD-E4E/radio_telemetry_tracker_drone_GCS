const fs = require('fs');
const path = require('path');

// Ensure build directory exists
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

// Copy index.html
const sourceFile = path.join(__dirname, '..', 'radio_telemetry_tracker_drone_gcs', 'electron', 'index.html');
const targetFile = path.join(buildDir, 'index.html');

try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log('Successfully copied index.html to build directory');
} catch (err) {
    console.error('Error copying file:', err);
    process.exit(1);
} 