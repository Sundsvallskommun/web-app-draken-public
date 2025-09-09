import { exec as execCb } from 'child_process';
import path from 'path';
import fs from 'node:fs';
import util from 'util';

import { APIS, API_BASE_URL } from './config/index';

const exec = util.promisify(execCb);
const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');

const main = async () => {
  console.log('Downloading and generating api-docs..');

  for (const api of APIS) {
    const apiDir = `${PATH_TO_OUTPUT_DIR}/${api.name}`;
    const swaggerPath = `${apiDir}/swagger.json`;

    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }

    await exec(`curl -o "${swaggerPath}" ${API_BASE_URL}/${api.name}/${api.version}/api-docs`);
    console.log(`- ${api.name} ${api.version}`);

    await exec(`npx swagger-typescript-api generate --path "${swaggerPath}" -o "${apiDir}" --modular --no-client --extract-enums`);

    await new Promise(res => setTimeout(res, 100));

    fs.unlinkSync(swaggerPath);
  }
};

main();
