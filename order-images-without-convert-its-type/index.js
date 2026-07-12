import fs from 'node:fs/promises';
import path from 'node:path';
import { directoryFrames, GLOBAL_PREFIX_IMAGES_NUM } from '../config.js';

const DIR = directoryFrames;
const PREFIX_NUM = 195 || 0;
const PREFIX_LETTER = 'u';
const EXTENSION = 'avif';

const naturalSort = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const renameFrames = async (dir) => {
  let files = await fs.readdir(dir);

  files = files
    .filter(f => !f.startsWith('.'))
    .sort(naturalSort);

  const tempFiles = [];

  // fase 1: mover a nombres temporales
  for (let i = 0; i < files.length; i++) {
    const original = path.join(dir, files[i]);
    const temp = path.join(dir, `.__tmp__${i}`);

    await fs.rename(original, temp);
    tempFiles.push(temp);
  }

  // fase 2: renombrar definitivo
  for (let i = 0; i < tempFiles.length; i++) {
    const newName = `${PREFIX_LETTER}${PREFIX_NUM + i + 1}.${EXTENSION}`;
    const newPath = path.join(dir, newName);

    await fs.rename(tempFiles[i], newPath);

    if (i % 100 === 0) {
      process.stdout.write(`✔ ${newName}\n`);
    }
  }
};

try {
  await renameFrames(DIR);
  console.log('All files renamed.');
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}