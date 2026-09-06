const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const dragons = JSON.parse(readFileSync(resolve(root, 'dragons.json'), 'utf8'));
const build = JSON.parse(readFileSync(resolve(root, 'dragon-build.json'), 'utf8'));
const side = process.argv[2];
if (side !== 'frontend' && side !== 'backend') throw new Error('Select frontend or backend');
const identity = process.env[side === 'frontend' ? 'NEXT_PUBLIC_APPLICATION' : 'APPLICATION'];
if (!identity || !Object.hasOwn(dragons, identity) || identity !== build.id) {
  throw new Error(`This ${build.id} ${side} image cannot run as dragon "${identity ?? ''}".`);
}
