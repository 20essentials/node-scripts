import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import fs from "node:fs/promises";
import path from "node:path";
import { directoryOldAudios, directoryNewAudios } from "../config.js";

const PREFIX_NAME_AUDIO = "a";
const START_AUDIO = 1;
const END_AUDIO = 2; // <-- variable configurable
const EXT_AUDIO = "mp3";
const OUTPUT = directoryNewAudios;
const OFFSET = 0;
const HALL = 60;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const arrayOfAudios = ({ start, end, ext = "mp3" }) => {
  const total = Math.abs(end - start) + 1;
  return Array.from({ length: total }, (_, i) =>
    path.join(directoryOldAudios, `${PREFIX_NAME_AUDIO}${i + start}.${ext}`)
  );
};

const durationOf = (src) =>
  new Promise((res, rej) =>
    ffmpeg.ffprobe(src, (e, d) => (e ? rej(e) : res(d.format.duration)))
  );

const cut = (src, start, length, out) =>
  new Promise((res, rej) => {
    const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
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
      .on("end", () => {
        clearInterval(loader);
        process.stdout.write(`\r✔ ${path.basename(out)}\n`);
        res();
      })
      .on("error", (err) => {
        clearInterval(loader);
        rej(err);
      })
      .run();
  });

const splitAudios = async (audios, hall, offset = 0) => {
  await fs.mkdir(OUTPUT, { recursive: true });
  let globalIndex = offset;
  const allOutputs = [];

  for (const audio of audios) {
    const total = await durationOf(audio);
    const parts = Math.ceil(total / hall);

    for (let i = 0; i < parts; i++) {
      const start = i * hall;
      const len = Math.min(hall, total - start);
      const outFile = path.join(OUTPUT, `${PREFIX_NAME_AUDIO}${globalIndex + 1}.mp3`);
      await cut(audio, start, len, outFile);
      allOutputs.push(outFile);
      globalIndex++;
    }
  }

  return allOutputs;
};

const AUDIOS = arrayOfAudios({ start: START_AUDIO, end: END_AUDIO, ext: EXT_AUDIO });

try {
  const result = await splitAudios(AUDIOS, HALL, OFFSET);
  console.log("Todos los fragmentos:", result);
} catch (e) {
  console.error("Error:", e.message || e);
  process.exit(1);
}
