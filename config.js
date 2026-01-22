import path from 'path';

const globalPath = subpath => path.resolve(process.cwd(), `--global/${subpath}`);

export const directoryFrames = globalPath('frames');
export const directoryNewFrames = globalPath('new-frames');
export const directoryVideos = globalPath('videos');
export const directoryNewVideos = globalPath('videos/video.mp4');
export const directoryNewVideosOutput = globalPath('oneVideo');
export const directoryOldAudios= globalPath('old-audios');
export const directoryNewAudios= globalPath('new-audios');
