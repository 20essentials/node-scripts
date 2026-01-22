import fs from 'node:fs/promises';
import path from 'node:path';
import { directoryVideos } from '../config.js';

const DIR = directoryVideos;
const PREFIX_NUM = 0;
const PREFIX_LETTER = 'v';
const EXTENSION = 'mp4';

const renameVideos = async (dir) => {
  const files = (await fs.readdir(dir))
    .filter(f => !f.startsWith('.'))
    .filter(f => path.extname(f).toLowerCase() === '.mp4')
    .sort();

  // Temporales para evitar colisiones
  const tempFiles = await Promise.all(
    files.map(async (file, i) => {
      const original = path.join(dir, file);
      const temp = path.join(dir, `.__tmp__${i}.mp4`);
      await fs.rename(original, temp);
      return temp;
    })
  );

  // Renombrado final
  for (let i = 0; i < tempFiles.length; i++) {
    const outName = `${PREFIX_LETTER}${PREFIX_NUM + i + 1}.${EXTENSION}`;
    const outPath = path.join(dir, outName);

    await fs.rename(tempFiles[i], outPath);
    process.stdout.write(`✔ ${outName}\n`);
  }
};

try {
  await renameVideos(DIR);
  console.log('All videos renamed.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
