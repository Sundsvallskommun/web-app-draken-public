const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { readRelease, runtimeEnvironment } = require('./dragon-deployment.cjs');

const root = resolve(__dirname, '..');
const dragons = JSON.parse(readFileSync(resolve(root, 'dragons.json'), 'utf8'));
function prepareImageEnvironment(side, environment = process.env) {
  if (side !== 'frontend' && side !== 'backend') throw new Error('Select frontend or backend');
  const build = JSON.parse(readFileSync(resolve(root, 'dragon-build.json'), 'utf8'));
  const identity = environment[side === 'frontend' ? 'NEXT_PUBLIC_APPLICATION' : 'APPLICATION'];
  if (!Object.hasOwn(dragons, build.id) || (identity && identity !== build.id)) {
    throw new Error('The runtime dragon does not match the immutable image identity.');
  }
  if (!environment.DRAKEN_DEPLOYMENT_FILE) throw new Error('DRAKEN_DEPLOYMENT_FILE is required for an image deployment.');
  const release = readRelease(environment.DRAKEN_DEPLOYMENT_FILE);
  return runtimeEnvironment(side, build, release, environment, environment.DRAKEN_SECRET_DIRECTORY || '/run/draken-secrets');
}
module.exports = { prepareImageEnvironment };
if (require.main === module) prepareImageEnvironment(process.argv[2]);
