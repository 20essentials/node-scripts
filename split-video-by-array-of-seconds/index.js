import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import { directoryVideos, directoryNewVideosOutput } from '../config.js';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const SEGMENTS = [
  { start: 8, end: 10 },
  { start: 29, end: 32 },
  { start: 48, end: 50  },
  { start: 71, end:  73 },
];

const INPUT_VIDEO = path.join(directoryVideos, 'v1.mp4');
const OUTPUT_DIR = directoryNewVideosOutput;

const cut = (src, start, duration, out) =>
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
      .setDuration(duration)
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

const concat = (inputs, out) =>
  new Promise((res, rej) => {
    const concatFile = path.join(path.dirname(out), '_concat.txt');
    const content = inputs.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');

    fs.writeFile(concatFile, content)
      .then(() => {
        ffmpeg()
          .input(concatFile)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .output(out)
          .on('end', async () => {
            await fs.unlink(concatFile);
            res();
          })
          .on('error', err => {
            fs.unlink(concatFile).catch(() => {});
            rej(err);
          })
          .run();
      })
      .catch(rej);
  });

const splitVideo = async (videoPath, segments, outputDir) => {
  await fs.mkdir(outputDir, { recursive: true });
  const temps = [];

  for (let i = 0; i < segments.length; i++) {
    const { start, end } = segments[i];
    const duration = end - start;
    const outFile = path.join(outputDir, `_tmp_${i + 1}.mp4`);
    await cut(videoPath, start, duration, outFile);
    temps.push(outFile);
  }

  const finalOut = path.join(outputDir, 'final.mp4');
  await concat(temps, finalOut);

  for (const f of temps) await fs.unlink(f);

  return finalOut;
};

try {
  const result = await splitVideo(INPUT_VIDEO, SEGMENTS, OUTPUT_DIR);
  console.log('Video final:', result);
} catch (e) {
  console.error('Error:', e.message || e);
  process.exit(1);
}
