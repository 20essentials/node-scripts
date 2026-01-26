import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

import {
  BUTTON_CLASSNAME,
  URL_DOWNLOAD_IMAGES_FROM_URL
} from "../localConfig.js";

import { directoryNewVideos } from "../config.js";

(async () => {
  if (!fs.existsSync(directoryNewVideos)) {
    fs.mkdirSync(directoryNewVideos, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(URL_DOWNLOAD_IMAGES_FROM_URL);
  await page.waitForTimeout(3000);

  const buttons = await page.$$(BUTTON_CLASSNAME);

  for (let i = 0; i < buttons.length; i++) {
    console.log(`▶️ Haciendo click en botón #${i + 1}...`);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      buttons[i].click()
    ]);

    const suggestedName = download.suggestedFilename();
    const extension = path.extname(suggestedName);
    const customName = `archivo_${i + 1}${extension}`;
    const fullPath = path.join(directoryNewVideos, customName);

    console.log(`⬇️ Descargando: ${customName}`);

    await download.saveAs(fullPath);

    console.log(`✅ Guardado en ${fullPath}`);
  }

  console.log("🎉 Todas las descargas finalizadas");
  await browser.close();
})();
