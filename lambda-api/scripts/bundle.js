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

archive.directory(path.join(__dirname, '../dist'), false, (entry) => {
  return entry.name === 'function.zip' ? false : entry;
});
archive.directory(path.join(__dirname, '../data'), 'data');
archive.directory(path.join(__dirname, '../node_modules'), 'node_modules');

archive.finalize();
