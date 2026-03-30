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

const TYPE = {
  H265_FAST: {
    codec: 'libx265',
    options: ['-crf 28', '-preset fast']
  },
  H264_ULTRAFAST: {
    codec: 'libx264',
    options: ['-crf 23', '-preset ultrafast']
  },
  AV1_CPU: {
    codec: 'libaom-av1',
    options: ['-crf 34', '-b:v 0', '-cpu-used 8'] // lento, solo test
  }
};

const CURRENT_TYPE = TYPE.H265_FAST;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const arrayOfVideos = ({ start, end, ext = 'mp4' }) => {
  const total = Math.abs(end - start) + 1;
  return Array.from({ length: total }, (_, i) =>
    path.join(directoryVideos, `${PREFIX_NAME_VIDEO}${i + start}.${ext}`)
  );
};

const VIDEOS = arrayOfVideos({ start: START_VIDEO, end: END_VIDEO, ext: EXT_VIDEO });

const compress = (src, out, type) =>
  new Promise((res, rej) => {
    const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let f = 0;
    const t0 = Date.now();

    const loader = setInterval(() => {
      const s = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r${frames[f]} ${path.basename(out)} (${s}s)`);
      f = (f + 1) % frames.length;
    }, 100);

    ffmpeg(src)
      .videoCodec(type.codec)
      .outputOptions(type.options)
      .noAudio()
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

const processVideos = async videos => {
  await fs.mkdir(OUTPUT, { recursive: true });
  const outputs = [];

  console.log('Codec usado (CPU):', CURRENT_TYPE.codec);

  for (const video of videos) {
    const name = path.parse(video).name;
    const outFile = path.join(OUTPUT, `${name}_${CURRENT_TYPE.codec}.mp4`);
    await compress(video, outFile, CURRENT_TYPE);
    outputs.push(outFile);
  }

  return outputs;
};

try {
  const result = await processVideos(VIDEOS);
  console.log('Procesados:', result);
} catch (e) {
  console.error('Error:', e.message || e);
  process.exit(1);
}