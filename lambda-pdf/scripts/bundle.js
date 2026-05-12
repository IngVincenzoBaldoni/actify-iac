// Zips the dist/ directory into dist/function.zip for Lambda deployment.
// Run after `npm run build:tsc`.
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const output = fs.createWriteStream(path.join(__dirname, '../dist/function.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const kb = Math.round(archive.pointer() / 1024);
  console.log(`✅  dist/function.zip — ${kb} KB`);
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);

// Include compiled JS and node_modules
archive.directory(path.join(__dirname, '../dist'), false, (entry) => {
  // Exclude the zip itself from being re-added
  return entry.name === 'function.zip' ? false : entry;
});
archive.directory(path.join(__dirname, '../node_modules'), 'node_modules');

archive.finalize();
