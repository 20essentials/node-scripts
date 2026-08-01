import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import { directoryVideos, directoryNewAudios } from '../config.js';

const PREFIX_NAME_VIDEO = 'v';
const START_VIDEO = 1;
const END_VIDEO = 1;
const AUDIO_FORMAT = 'mp3';
const AUDIO_BITRATE = '320k';
const AUDIO_SAMPLE_RATE = 44100;
const AUDIO_CHANNELS = 2;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const checkFfmpeg = () =>
  new Promise((res) => {
    ffmpeg.getAvailableFormats((err) => {
      res(!err);
    });
  });

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

const extractAudio = (src, outPath) =>
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
      .noVideo()
      .audioBitrate(AUDIO_BITRATE)
      .audioFrequency(AUDIO_SAMPLE_RATE)
      .audioChannels(AUDIO_CHANNELS)
      .format(AUDIO_FORMAT)
      .output(outPath)
      .on('end', () => {
        clearInterval(loader);
        process.stdout.write(`\r✔ ${path.basename(outPath)}\n`);
        res();
      })
      .on('error', err => {
        clearInterval(loader);
        console.error(`\nError procesando ${path.basename(src)}:`, err.message);
        rej(err);
      })
      .run();
  });

try {
  const ffmpegOk = await checkFfmpeg();
  if (!ffmpegOk) {
    console.error('Error: ffmpeg no está disponible o no funciona correctamente.');
    process.exit(1);
  }

  console.log(`Configuración: ${AUDIO_FORMAT.toUpperCase()} @ ${AUDIO_BITRATE} / ${AUDIO_SAMPLE_RATE}Hz / ${AUDIO_CHANNELS}ch`);

  await fs.mkdir(directoryNewAudios, { recursive: true });

  for (const video of VIDEOS) {
    const exists = await fs.access(video).then(() => true).catch(() => false);
    if (!exists) {
      console.log(`Saltando ${video} (no existe)`);
      continue;
    }

    const total = await durationOf(video);
    console.log(`Procesando ${video} (${total.toFixed(2)}s)`);

    const baseName = path.basename(video, path.extname(video));
    const outPath = path.join(directoryNewAudios, `${baseName}.${AUDIO_FORMAT}`);

    await extractAudio(video, outPath);
  }

  console.log('Hecho.');
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
