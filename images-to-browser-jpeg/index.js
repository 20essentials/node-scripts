import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { directoryFrames, GLOBAL_PREFIX_IMAGES_NUM } from '../config.js';

const DIR = directoryFrames;
const PREFIX_NUM = GLOBAL_PREFIX_IMAGES_NUM || 0;
const PREFIX_LETTER = 'u';
const EXTENSION = 'jpg';
const QUALITY = 85;
const CONCURRENCY = 8;

const renameAndConvertFrames = async (dir) => {
  const files = (await fs.readdir(dir))
    .filter(f => !f.startsWith('.'))
    .sort();

  const tempFiles = await Promise.all(
    files.map(async (file, i) => {
      const original = path.join(dir, file);
      const temp = path.join(dir, `.__tmp__${i}`);
      await fs.rename(original, temp);
      return temp;
    })
  );

  let index = 0;

  const worker = async () => {
    while (index < tempFiles.length) {
      const i = index++;
      const tempFile = tempFiles[i];

      const outName = `${PREFIX_LETTER}${PREFIX_NUM + i + 1}.${EXTENSION}`;
      const outPath = path.join(dir, outName);

      await sharp(tempFile)
        .jpeg({
          quality: QUALITY,
          mozjpeg: true
        })
        .toFile(outPath);

      await fs.unlink(tempFile);

      process.stdout.write(`✔ ${outName}\n`);
    }
  };

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker())
  );
};

try {
  await renameAndConvertFrames(DIR);
  console.log('All files renamed and converted to JPEG.');
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}