import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { directoryFrames, directoryJpgFrames } from '../config.js';

const inputFolder = directoryFrames;
const outputFolder = directoryJpgFrames;
const prefix = 'u';
const QUALITY = 95;

async function convertFramesToJpg() {
  await fs.mkdir(outputFolder, { recursive: true });
  const files = await fs.readdir(inputFolder);

  let counter = 1;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const valid = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp', '.avif'];
    if (!valid.includes(ext)) continue;

    const inputPath = path.join(inputFolder, file);
    const outputName = `${prefix}${counter}.jpg`;
    const outputPath = path.join(outputFolder, outputName);

    if (ext === '.jpg' || ext === '.jpeg') {
      await fs.copyFile(inputPath, outputPath);
    } else {
      await sharp(inputPath)
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(outputPath);
    }

    process.stdout.write(`✔ ${outputName}\n`);
    counter++;
  }

  console.log(`\nDone. ${counter - 1} files converted to JPG.`);
}

convertFramesToJpg();
