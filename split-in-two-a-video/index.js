import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import { directoryVideos, directoryNewVideosOutput } from '../config.js';

const PREFIX_NAME_VIDEO = 'v';
const START_VIDEO = 1;
const END_VIDEO = 1;
const EXT_VIDEO = 'mp4';

const OUTPUT = directoryNewVideosOutput;

// 👉 segundo donde quieres cortar
const CUT_SECOND = 3;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

// Generar lista de videos
const arrayOfVideos = ({ start, end, ext = 'mp4' }) => {
  const total = Math.abs(end - start) + 1;
  return Array.from({ length: total }, (_, i) =>
    path.join(directoryVideos, `${PREFIX_NAME_VIDEO}${i + start}.${ext}`)
  );
};

const VIDEOS = arrayOfVideos({
  start: START_VIDEO,
  end: END_VIDEO,
  ext: EXT_VIDEO
});

// Obtener duración
const durationOf = src =>
  new Promise((res, rej) =>
    ffmpeg.ffprobe(src, (e, d) => (e ? rej(e) : res(d.format.duration)))
  );

// Cortar video
const cut = (src, start, length, out) =>
  new Promise((res, rej) => {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let f = 0;
    const t0 = Date.now();

    const loader = setInterval(() => {
      const s = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r${frames[f]} ${path.basename(out)} (${s}s)`);
      f = (f + 1) % frames.length;
    }, 100);

    ffmpeg(src)
      .setStartTime(start)
      .setDuration(length)
      .output(out)
      .on('end', () => {
        clearInterval(loader);
        process.stdout.write(`\r✔ ${path.basename(out)}\n`);
        res();
      })
      .on('error', err => {
        clearInterval(loader);
        rej(err);
      })
      .run();
  });

// 🔥 NUEVA FUNCIÓN: dividir en 2 partes
const splitAtSecond = async (src, second, outputDir, index) => {
  await fs.mkdir(outputDir, { recursive: true });

  const total = await durationOf(src);

  if (second >= total) {
    throw new Error(
      `El segundo (${second}) es mayor que la duración del video (${total})`
    );
  }

  const part1 = path.join(outputDir, `v${index}_part1.mp4`);
  const part2 = path.join(outputDir, `v${index}_part2.mp4`);

  // Parte 1
  await cut(src, 0, second, part1);

  // Parte 2
  await cut(src, second, total - second, part2);

  return [part1, part2];
};

// 🚀 Procesar todos los videos
const processVideos = async () => {
  let index = 1;
  const allOutputs = [];

  for (const video of VIDEOS) {
    console.log(`\n📹 Procesando: ${path.basename(video)}`);

    const parts = await splitAtSecond(
      video,
      CUT_SECOND,
      OUTPUT,
      index
    );

    allOutputs.push(...parts);
    index++;
  }

  return allOutputs;
};

// ▶️ Ejecutar
try {
  const result = await processVideos();
  console.log('\n🎉 Todos los fragmentos:', result);
} catch (e) {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
}