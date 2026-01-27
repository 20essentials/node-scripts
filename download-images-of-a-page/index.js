import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { directoryNewFrames } from '../config.js';
import { URL_DOWNLOAD_IMAGES_FROM_URL, IMAGE_CLASSNAME } from './localConfig.js';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(URL_DOWNLOAD_IMAGES_FROM_URL);
  await page.waitForTimeout(3000);

  const downloadDir = directoryNewFrames;
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
  }

  const imageUrls = await page.$$eval(IMAGE_CLASSNAME, imgs =>
    imgs.map(img => img.src)
  );

  console.log(`🔍 Found ${imageUrls.length} images.`);

  const downloadImage = (url, filepath) =>
    new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filepath);
      https
        .get(url, response => {
          response.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        })
        .on('error', err => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
    });

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `u${i + 1}${ext}`;
    const filepath = path.join(downloadDir, filename);

    console.log(`⬇️ Downloading ${filename}...`);
    await downloadImage(url, filepath);
  }

  console.log('✅ All images were downloaded successfully.');
  await browser.close();
})();
