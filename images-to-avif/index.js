import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { directoryFrames, directoryNewFrames } from '../config.js';

const inputFolder = directoryFrames;
const outputFolder = directoryNewFrames;
const prefix = 'u';

async function convertFolderToAvif() {
  await fs.mkdir(outputFolder, { recursive: true });
  const files = await fs.readdir(inputFolder);

  let counter = 1;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const valid = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp', '.avif'];
    if (!valid.includes(ext)) continue;

    const inputPath = path.join(inputFolder, file);
    const outputName = `${prefix}${counter}.avif`;
    const outputPath = path.join(outputFolder, outputName);

    if (ext === '.avif') {
      await fs.copyFile(inputPath, outputPath);
    } else {
      await sharp(inputPath)
        .avif({
          quality: 90,
          chromaSubsampling: '4:4:4'
        })
        .toFile(outputPath);
    }

    counter++;
  }
}

convertFolderToAvif();
