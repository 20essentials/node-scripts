import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { directoryFrames, GLOBAL_PREFIX_NUM } from '../config.js';

const DIR = directoryFrames;
const PREFIX_NUM = GLOBAL_PREFIX_NUM || 0;
const PREFIX_LETTER = 'u';
const EXTENSION = 'avif';
const QUALITY = 90;

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

  for (let i = 0; i < tempFiles.length; i++) {
    const outName = `${PREFIX_LETTER}${PREFIX_NUM + i + 1}.${EXTENSION}`;
    const outPath = path.join(dir, outName);

    await sharp(tempFiles[i])
      .avif({ quality: QUALITY })
      .toFile(outPath);

    await fs.unlink(tempFiles[i]);
    process.stdout.write(`✔ ${outName}\n`);
  }
};

try {
  await renameAndConvertFrames(DIR);
  console.log('All files renamed and converted.');
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
