import Replicate from 'replicate';
process.loadEnvFile();
import fs from 'fs';
import { join } from 'path';

/* If you want details: https://replicate.com/kylan02/face-looker?input=nodejs */
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

const pathFoto = join(process.cwd(), 'face-looker', 'foto.jpg');

const input = {
  size: 256,
  step: 3,
  image: fs.createReadStream(pathFoto),
  // image:
  //   'https://replicate.delivery/pbxt/O0abEcdlhyCN7KrUAULW93COhkqadO5vTJN08kRqjHo7tfAw/0_1.webp',
  max_value: 15,
  min_value: -15
};

const output = await replicate.run('kylan02/face-looker', { input });

console.log(output);
