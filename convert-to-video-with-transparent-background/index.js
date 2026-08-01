import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'node:fs/promises';
import path from 'node:path';
import { removeBackground } from '@imgly/background-removal-node';
import { directoryVideos } from '../config.js';

const PREFIX_NAME_VIDEO = 'v';
const START_VIDEO = 1;
const END_VIDEO = 1;
const EXT_VIDEO = 'mp4';
const FPS = 10;

const DIR_RAW = './convert-to-video-with-transparent-background/_frames-raw';
const DIR_CLEAN = './convert-to-video-with-transparent-background/_frames_clean';

const FORMAT = 'webm'; // 'webm' | 'prores'
const QUALITY = 'better'; // 'good' | 'better' | 'best'

const OUTPUTS = {
  webm: './convert-to-video-with-transparent-background/output-transparent.webm',
  prores: './convert-to-video-with-transparent-background/output-transparent.mov',
};

const OUTPUT = OUTPUTS[FORMAT];

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const arrayOfVideos = ({ start, end, ext }) => {
  const total = Math.abs(end - start) + 1;
  return Array.from({ length: total }, (_, i) =>
    path.join(directoryVideos, `${PREFIX_NAME_VIDEO}${i + start}.${ext}`)
  );
};

const VIDEOS = arrayOfVideos({ start: START_VIDEO, end: END_VIDEO, ext: EXT_VIDEO });

const extractFrames = (src, dest) =>
  new Promise((res, rej) => {
    const spinner = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    let si = 0;
    const t0 = Date.now();
    const loader = setInterval(() => {
      process.stdout.write(`\r${spinner[si]} extrayendo frames (${((Date.now()-t0)/1000).toFixed(1)}s)`);
      si = (si + 1) % spinner.length;
    }, 100);

    ffmpeg(src)
      .outputOptions(['-vf', `fps=${FPS}`])
      .output(path.join(dest, 'frame-%d.png'))
      .on('end', () => {
        clearInterval(loader);
        process.stdout.write(`\r✔ frames extraidos (${((Date.now()-t0)/1000).toFixed(1)}s)\n`);
        res();
      })
      .on('error', err => {
        clearInterval(loader);
        rej(err);
      })
      .run();
  });

const removeBgFromFrames = async (srcDir, destDir) => {
  const files = await fs.readdir(srcDir);
  const frames = files
    .filter(f => f.endsWith('.png'))
    .map(f => ({
      name: f,
      num: Number(f.match(/frame-(\d+)\.png$/)?.[1])
    }))
    .filter(f => !Number.isNaN(f.num))
    .sort((a, b) => a.num - b.num);

  const total = frames.length;
  for (const [i, frame] of frames.entries()) {
    const inPath = path.join(srcDir, frame.name);
    const outPath = path.join(destDir, frame.name);
    const blob = await removeBackground(inPath);
    await fs.writeFile(outPath, Buffer.from(await blob.arrayBuffer()));

    const pct = ((i + 1) / total * 100).toFixed(0);
    process.stdout.write(`\r  removiendo fondos ${pct}% (${i+1}/${total})`);
  }
  process.stdout.write('\n');
};

const VP9_QUALITY = {
  good:  { crf: 23, cpuUsed: 2 },
  better: { crf: 18, cpuUsed: 1 },
  best:  { crf: 12, cpuUsed: 0 },
};

const reassembleVideo = (frameDir, output) =>
  new Promise((res, rej) => {
    const t0 = Date.now();
    const loader = setInterval(() => {
      process.stdout.write(`\r  reensamblando video (${((Date.now()-t0)/1000).toFixed(1)}s)`);
    }, 100);

    const cmd = ffmpeg()
      .input(path.join(frameDir, 'frame-%d.png'))
      .inputOption(`-framerate ${FPS}`);

    if (FORMAT === 'prores') {
      cmd.videoCodec('prores')
        .outputOptions([
          '-pix_fmt yuva444p10le',
          '-profile:v 4',
          '-vf', 'format=yuva444p10le',
        ]);
    } else {
      const q = VP9_QUALITY[QUALITY];
      cmd.videoCodec('libvpx-vp9')
        .outputOptions([
          '-pix_fmt yuva420p',
          '-b:v 0',
          `-crf ${q.crf}`,
          `-cpu-used ${q.cpuUsed}`,
          '-row-mt 1',
          '-tile-columns 2',
          '-frame-parallel 0',
          '-auto-alt-ref 0',
          '-metadata:s:v:0 alpha_mode=1',
          '-vf', 'format=yuva420p',
        ]);
    }

    cmd
      .output(output)
      .on('end', () => {
        clearInterval(loader);
        process.stdout.write(`\r✔ video reensamblado (${((Date.now()-t0)/1000).toFixed(1)}s)\n`);
        res();
      })
      .on('error', err => {
        clearInterval(loader);
        rej(err);
      })
      .run();
  });

const clean = async (...dirs) => {
  for (const dir of dirs) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
};

const framesExist = async dir => {
  try {
    const files = await fs.readdir(dir);
    return files.some(f => f.endsWith('.png'));
  } catch {
    return false;
  }
};

try {
  const alreadyHasFrames = await framesExist(DIR_CLEAN);

  if (alreadyHasFrames) {
    console.log(`Usando frames existentes de ${DIR_CLEAN}`);
  } else {
    await clean(DIR_RAW);

    await fs.mkdir(DIR_RAW, { recursive: true });
    await fs.mkdir(DIR_CLEAN, { recursive: true });

    for (const video of VIDEOS) {
      console.log(`Procesando ${path.basename(video)}`);
      await extractFrames(video, DIR_RAW);
      await removeBgFromFrames(DIR_RAW, DIR_CLEAN);
    }
  }

  await reassembleVideo(DIR_CLEAN, OUTPUT);
  console.log(`Hecho: ${OUTPUT}`);
} catch (e) {
  console.error(`\nError: ${e.message || e}`);
  process.exit(1);
}
