import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dragons = JSON.parse(readFileSync(resolve(root, 'dragons.json'), 'utf8'));
// Derive paths from the catalog key, never from the caller's spelling of it.
const id = Object.keys(dragons).find((key) => key === process.argv[2]?.toUpperCase());
assert.ok(id, 'Specify a valid dragon');
const definition = dragons[id];
const output = resolve(root, `backend/dist-${id}`);
const has = (file) => existsSync(resolve(output, file));
assert.equal(JSON.parse(readFileSync(resolve(output, 'dragon-build.json'), 'utf8')).id, id);
assert.ok(has(`dragons/${id.toLowerCase()}/server.js`));
for (const other of Object.keys(dragons).filter(other => other !== id)) {
  assert.equal(has(`dragons/${other.toLowerCase()}`), false, `Must not ship another dragon: ${other}`);
}
assert.equal(has('controllers/casedata'), definition.domain === 'casedata', 'CaseData controllers only ship in CaseData apps');
assert.equal(has('controllers/supportmanagement'), definition.domain === 'supportmanagement', 'SM controllers only ship in SM apps');
assert.equal(has('controllers/supportmanagement/support-errand-json-parameter.controller.js'), definition.investigation === 'avvikelse');
assert.equal(has('avvikelse'), definition.investigation === 'avvikelse', 'Avvikelse business rules only ship in apps that compose them');
assert.equal(has('controllers.js'), false, 'A universal controller registry must never ship');
assert.equal(has('tests'), false, 'Tests must not ship');
process.stdout.write(`${id}: artifact boundaries verified\n`);
