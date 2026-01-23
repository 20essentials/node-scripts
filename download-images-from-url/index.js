import https from 'https';
import fs from 'fs';
import path from 'path';
import { directoryNewFrames} from '../config.js'

const baseUrl = 'https://sirv.sirv.com/website/demos/virtuaspin/3D-ring/ring-01-';
const queryParams = '?scale.option=fill&w=1280&h=720&format=webp';
const downloadFolder = directoryNewFrames;
const IMAGE_INPUT_EXTENSION = 'jpg';
const MAX_FRAMES = 50;
const formatImageIndex = i => i.toString().padStart(3, '0');
const IMAGE_OUTPUT_PREFIX = 'anillo';
const IMAGE_OUTPUT_EXTENSION = 'webp';

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https
      .get(url, response => {
        if (response.statusCode !== 200) {
          reject(`Error ${response.statusCode} al descargar ${url}`);
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve(`✅ Descargado: ${filepath}`));
        });

        file.on('error', err => {
          fs.unlink(filepath, () => reject(err));
        });
      })
      .on('error', err => reject(err));
  });
}

async function downloadAllImages() {
  if (!fs.existsSync(downloadFolder)) {
    fs.mkdirSync(downloadFolder);
  }

  const downloadPromises = [];

  for (let i = 1; i <= MAX_FRAMES; i++) {
    const imageUrl = `${baseUrl}${formatImageIndex(
      i
    )}.${IMAGE_INPUT_EXTENSION}${queryParams}`;
    const outputPath = path.join(
      downloadFolder,
      `${IMAGE_OUTPUT_PREFIX}-${i}.${IMAGE_OUTPUT_EXTENSION}`
    );
    downloadPromises.push(downloadImage(imageUrl, outputPath));
  }

  try {
    const results = await Promise.all(downloadPromises);
    results.forEach(msg => console.log(msg));
    console.log('🎉 Todas las imágenes se descargaron correctamente.');
  } catch (error) {
    console.error('❌ Ocurrió un error en la descarga:', error);
  }
}

downloadAllImages();
