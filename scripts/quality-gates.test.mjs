import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { missingEffectiveRules, missingSuccessfulChecks } from './quality-gates.mjs';

const manifest = JSON.parse(readFileSync(new URL('../.github/draken-quality-ruleset.json', import.meta.url), 'utf8'));
const checks = manifest.rules.find(({ type }) => type === 'required_status_checks').parameters.required_status_checks;
const successful = checks.map(({ context, integration_id }, index) => ({ id: index, name: context, app: { id: integration_id }, status: 'completed', conclusion: 'success' }));

test('activation requires success for every configured check, from the intended app', () => {
  assert.deepEqual(missingSuccessfulChecks(checks, successful), []);
  assert.deepEqual(missingSuccessfulChecks(checks, successful.slice(1)), [checks[0].context]);
  for (const changed of [
    { app: { id: 1 } }, { status: 'in_progress' }, { conclusion: 'skipped' }, { conclusion: 'neutral' }, { conclusion: 'failure' },
  ]) {
    assert.deepEqual(missingSuccessfulChecks(checks, [{ ...successful[0], ...changed }, ...successful.slice(1)]), [checks[0].context]);
  }
});

test('an earlier successful run cannot hide a failed rerun', () => {
  assert.deepEqual(missingSuccessfulChecks(checks, [...successful, { ...successful[0], id: 1000, conclusion: 'failure' }]), [checks[0].context]);
});

test('a checked-in manifest is insufficient: effective rules must require strict checks and code owners', () => {
  assert.deepEqual(missingEffectiveRules(manifest.rules, manifest.rules), []);
  assert.equal(missingEffectiveRules(manifest.rules, []).length, checks.length + 1);
  const weak = structuredClone(manifest.rules);
  weak.find(({ type }) => type === 'pull_request').parameters.require_code_owner_review = false;
  weak.find(({ type }) => type === 'required_status_checks').parameters.strict_required_status_checks_policy = false;
  assert.equal(missingEffectiveRules(manifest.rules, weak).length, checks.length + 1);
});
