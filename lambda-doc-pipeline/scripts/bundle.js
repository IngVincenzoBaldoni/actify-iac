const archiver = require('archiver');
const fs        = require('fs');
const path      = require('path');

const HANDLERS = [
  'assembleContext',
  'generateSlot',
  'validateDocument',
  'assembleDocument',
  'persistAudit',
];

async function createZip(handlerName) {
  const distDir = path.join(__dirname, '../dist');
  const zipPath = path.join(distDir, `${handlerName}.zip`);

  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const kb = Math.round(archive.pointer() / 1024);
      console.log(`✅  dist/${handlerName}.zip — ${kb} KB`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);

    // Include compiled dist (minus other zips) + node_modules
    archive.directory(distDir, false, (entry) => {
      if (entry.name.endsWith('.zip')) return false;
      return entry;
    });
    archive.directory(path.join(__dirname, '../node_modules'), 'node_modules');
    archive.finalize();
  });
}

async function main() {
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    console.error('❌  dist/ not found — run `npm run build:tsc` first');
    process.exit(1);
  }
  for (const handler of HANDLERS) {
    await createZip(handler);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
