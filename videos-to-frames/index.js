import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { directoryFrames, directoryVideos } from '../config.js';

const PREFIX_NAME_VIDEO = 'v';
const START_VIDEO = 1;
const END_VIDEO = 1;
const OUTPUT = directoryFrames;
const FPS = 1;
const PREFIX_NUM = 0;
const PREFIX = 'u';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const arrayOfVideos = ({ start, end, ext = 'mp4' }) => {
  const total = Math.abs(end - start) + 1;
  return Array.from(
    { length: total },
    (_, i) => `${directoryVideos}/${PREFIX_NAME_VIDEO}${i + start}.${ext}`
  );
};
const VIDEOS = arrayOfVideos({ start: START_VIDEO, end: END_VIDEO });

const durationOf = src =>
  new Promise((res, rej) =>
    ffmpeg.ffprobe(src, ['-v', 'error'], (e, d) =>
      e ? rej(e) : res(d.format.duration)
    )
  );

const extractFrames = (src, fps, outDir, prefix) =>
  new Promise((res, rej) => {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let si = 0;
    const t0 = Date.now();

    const loader = setInterval(() => {
      const s = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r${spinner[si]} ${path.basename(src)} (${s}s)`);
      si = (si + 1) % spinner.length;
    }, 100);

    ffmpeg(src)
      .outputOptions(['-vf', `fps=${fps}`])
      .output(path.join(outDir, `${prefix}%d.png`))
      .on('end', () => {
        clearInterval(loader);
        process.stdout.write(`\r✔ ${path.basename(src)}\n`);
        res();
      })
      .on('error', err => {
        clearInterval(loader);
        rej(err);
      })
      .run();
  });

const convertPngsToAvif = async (outDir, prefix, startIndex) => {
  const files = await fs.readdir(outDir);
  const pngs = files
    .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
    .map(f => ({
      name: f,
      num: Number(f.match(new RegExp(`${prefix}(\\d+)\\.png$`))?.[1])
    }))
    .filter(x => !Number.isNaN(x.num))
    .sort((a, b) => a.num - b.num);

  for (let i = 0; i < pngs.length; i++) {
    const inPath = path.join(outDir, pngs[i].name);
    const outName = `${prefix}${startIndex + i}.avif`;
    const outPath = path.join(outDir, outName);
    await sharp(inPath).avif({ quality: 50 }).toFile(outPath);
    await fs.unlink(inPath);
    process.stdout.write(`✔ ${outName}\n`);
  }

  return pngs.length;
};

const getLastIndex = async () => {
  try {
    const files = await fs.readdir(OUTPUT);
    const nums = files
      .map(f => Number(f.match(new RegExp(`${PREFIX}(\\d+)\\.avif$`))?.[1]))
      .filter(n => !Number.isNaN(n));
    return nums.length ? Math.max(...nums) + 1 : PREFIX_NUM;
  } catch {
    return PREFIX_NUM;
  }
};

try {
  await fs.mkdir(OUTPUT, { recursive: true });

  let currentIndex = await getLastIndex();

  for (const video of VIDEOS) {
    const total = await durationOf(video);
    console.log(`Procesando ${video} (${total.toFixed(2)}s)`);

    await extractFrames(video, FPS, OUTPUT, PREFIX);

    const framesGenerated = await convertPngsToAvif(OUTPUT, PREFIX, currentIndex);

    currentIndex += framesGenerated;
  }

  console.log('Hecho.');
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
