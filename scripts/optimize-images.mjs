import { readdir, readFile, writeFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('dist');
const socialImage = 'Раки с укропом и лимоном на тёмной тарелке.png';
const textExtensions = new Set(['.js', '.css', '.html']);
const files = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else files.push(full);
  }
}

await stat(root);
await walk(root);

const pngFiles = files.filter((file) => path.extname(file).toLowerCase() === '.png');
if (pngFiles.length === 0) {
  console.log('Image optimization: no PNG files found; nothing to do.');
  process.exit(0);
}

let beforeBytes = 0;
let afterBytes = 0;
const converted = [];

for (const file of pngFiles) {
  const info = await stat(file);
  beforeBytes += info.size;

  if (path.basename(file) === socialImage) {
    afterBytes += info.size;
    continue;
  }

  const output = file.slice(0, -4) + '.webp';
  await sharp(file)
    .rotate()
    .webp({ quality: 82, effort: 5 })
    .toFile(output);

  const outputInfo = await stat(output);
  if (outputInfo.size === 0) throw new Error(`Empty WebP output: ${output}`);
  afterBytes += outputInfo.size;
  converted.push({ input: file, output });
}

for (const file of files.filter((item) => textExtensions.has(path.extname(item).toLowerCase()))) {
  let content = await readFile(file, 'utf8');
  if (path.extname(file).toLowerCase() === '.html') {
    content = content.replace(
      /(<link\\b[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*href=["'][^"']+)\\.png(["'][^>]*>)/gi,
      '$1.webp$2'
    );
  } else {
    content = content.replace(/\\.png(?=["'\\s)])/gi, '.webp');
  }
  await writeFile(file, content);
}

for (const file of converted.map((item) => item.input)) {
  await unlink(file);
}

console.log(
  `Image optimization complete: ${converted.length} PNG → WebP; ` +
  `original social preview retained; ${(beforeBytes / 1048576).toFixed(1)} MB → ${(afterBytes / 1048576).toFixed(1)} MB.`
);
