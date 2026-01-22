import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import { directoryVideos, directoryNewVideosOutput } from '../config.js';
const PREFIX_NAME_VIDEO = 'v';
const START_VIDEO = 1;
const END_VIDEO = 3;
const EXT_VIDEO = 'mp4';
const OUTPUT = directoryNewVideosOutput;
const OFFSET = 0;
const HALL = 5;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

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

const durationOf = src =>
  new Promise((res, rej) =>
    ffmpeg.ffprobe(src, (e, d) => (e ? rej(e) : res(d.format.duration)))
  );

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

const splitVideos = async (videos, hall, offset = 0) => {
  await fs.mkdir(OUTPUT, { recursive: true });
  let globalIndex = offset;
  const allOutputs = [];

  for (const video of videos) {
    const total = await durationOf(video);
    const parts = Math.ceil(total / hall);

    for (let i = 0; i < parts; i++) {
      const start = i * hall;
      const len = Math.min(hall, total - start);
      const outFile = path.join(OUTPUT, `v${globalIndex + 1}.mp4`);
      await cut(video, start, len, outFile);
      allOutputs.push(outFile);
      globalIndex++;
    }
  }

  return allOutputs;
};

try {
  const result = await splitVideos(VIDEOS, HALL, OFFSET);
  console.log('Todos los fragmentos:', result);
} catch (e) {
  console.error('Error:', e.message || e);
  process.exit(1);
}
