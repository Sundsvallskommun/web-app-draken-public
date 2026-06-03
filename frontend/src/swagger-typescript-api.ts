import { execFile } from 'child_process';
import { promisify } from 'node:util';
import path from 'path';
import fs from 'node:fs';
import os from 'node:os';
import { config } from 'dotenv';
config();

// `execFile` (not `exec`) passes arguments without a shell, so the temp path and
// API URL aren't re-interpreted by the shell.
const execFileAsync = promisify(execFile);
const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');

const main = async () => {
  if (!fs.existsSync(`${PATH_TO_OUTPUT_DIR}/backend`)) {
    fs.mkdirSync(`${PATH_TO_OUTPUT_DIR}/backend`, { recursive: true });
  }

  // Download into an isolated temp dir so the spec never lingers in the repo.
  const specPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'draken-contract-')), 'backend-swagger.json');

  console.log('Downloading and generating api-docs for backend');
  await execFileAsync('curl', [
    '--fail',
    '--silent',
    '--show-error',
    '-o',
    specPath,
    `${process.env.NEXT_PUBLIC_API_URL}/swagger.json`,
  ]);

  const { stdout, stderr } = await execFileAsync('npx', [
    'swagger-typescript-api',
    'generate',
    '--path',
    specPath,
    '-o',
    `${PATH_TO_OUTPUT_DIR}/backend`,
    '--modular',
    '--no-client',
    '--extract-enums',
  ]);

  if (stdout) console.log(`Data-contract-generator: ${stdout}`);
  if (stderr) console.log(`stderr: ${stderr}`);
};

main().catch((error) => {
  console.log(`error: ${error.message}`);
  process.exit(1);
});
