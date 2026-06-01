import { execFile } from 'child_process';
import { promisify } from 'node:util';
import path from 'path';
import fs from 'node:fs';

import { APIS, API_BASE_URL } from './config/index';

// `execFile` is callback-based and returns a (non-thenable) ChildProcess, so
// awaiting it directly does NOT wait for completion. Promisify it so the curl
// download is guaranteed to finish before we hand the swagger file to the
// generator. Using `execFile` (not `exec`) means arguments are passed without a
// shell, so paths and the base URL aren't re-interpreted by the shell.
const execFileAsync = promisify(execFile);

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), './src/data-contracts');

type Api = { name: string; version: string };

/**
 * Download the OpenAPI spec for a single API and generate its data contracts.
 * Download and generation are sequenced so the generator never reads a
 * half-written (truncated) spec. The downloaded spec is deleted afterwards so
 * it never lingers next to the generated contracts.
 */
const generateForApi = async ({ name, version }: Api): Promise<void> => {
  const outputDir = `${PATH_TO_OUTPUT_DIR}/${name}`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const specPath = `${outputDir}/swagger.json`;

  try {
    // `--fail` makes curl exit non-zero on HTTP errors instead of writing an
    // error page to disk and having the generator choke on it later.
    await execFileAsync('curl', [
      '--fail',
      '--silent',
      '--show-error',
      '-o',
      specPath,
      `${API_BASE_URL}/${name}/${version}/api-docs`,
    ]);
    console.log(`- ${name} ${version}`);

    const { stdout, stderr } = await execFileAsync('npx', [
      'swagger-typescript-api',
      'generate',
      '--path',
      specPath,
      '-o',
      outputDir,
      '--modular',
      '--no-client',
      '--extract-enums',
    ]);

    if (stdout) console.log(`Data-contract-generator: ${stdout}`);
    if (stderr) console.log(`stderr: ${stderr}`);
  } catch (error) {
    console.log(`error (${name} ${version}): ${error.message}`);
  } finally {
    // Remove the downloaded spec so it doesn't pollute the tree (it would
    // otherwise be picked up by tsc) — runs even if generation failed.
    fs.rmSync(specPath, { force: true });
  }
};

const main = async () => {
  console.log('Downloading and generating api-docs..');
  await Promise.all(APIS.map(generateForApi));
};

main();
