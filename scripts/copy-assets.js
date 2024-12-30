const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy index.html
const sourceFile = path.join(__dirname, '..', 'radio_telemetry_tracker_drone_gcs', 'electron', 'index.html');
const targetFile = path.join(distDir, 'index.html');

try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log('Successfully copied index.html to dist directory');
} catch (err) {
    console.error('Error copying file:', err);
    process.exit(1);
} 