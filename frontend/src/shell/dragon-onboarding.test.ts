import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DRAGON_IDS, type DragonId } from '@dragons/dragon-module';
import { test } from 'vitest';

import coverage from '../../e2e/dragon-coverage.json';
import playwright from '../../playwright.config';
import { DRAGON_REGISTRY } from './dragon-registry.test-fixture';

// A catalog addition must choose coverage deliberately; there is no default representative app.
const dragonCoverage: Readonly<Record<DragonId, { project: string; suite: string }>> = coverage;

test('each catalog dragon has a typed test module and an executable Playwright project', () => {
  assert.deepEqual(Object.keys(dragonCoverage).sort(), [...DRAGON_IDS].sort());
  assert.deepEqual(Object.keys(DRAGON_REGISTRY).sort(), [...DRAGON_IDS].sort());
  const projects = playwright.projects ?? [];
  assert.equal(new Set(projects.map(({ name }) => name)).size, projects.length, 'Duplicate Playwright project');
  const workflow = readFileSync(new URL('../../../.github/workflows/playwright.yml', import.meta.url), 'utf8');
  for (const id of DRAGON_IDS) {
    const entry = dragonCoverage[id];
    assert.equal(DRAGON_REGISTRY[id].id, id);
    assert.equal(entry.project, id.toLowerCase(), `${id}: coverage must start this dragon's own build`);
    assert.ok(['integration', 'smoke'].includes(entry.suite), `${id}: unknown coverage suite`);
    const project = projects.find(({ name }) => name === entry.project);
    assert.ok(project, `${id}: Playwright project is missing`);
    assert.ok(project.testDir, `${id}: project has no test directory`);
    const testDirectory = fileURLToPath(new URL(`../../${project.testDir}/`, import.meta.url));
    assert.ok(existsSync(testDirectory), `${id}: test directory is missing`);
    assert.ok(
      readdirSync(testDirectory).some((file) => file.endsWith('.spec.ts')),
      `${id}: no browser tests`
    );
    if (entry.suite === 'integration') {
      assert.match(workflow, new RegExp(`- app: ${entry.project}\\s`), `${id}: integration project is absent from CI`);
    }
  }
});
