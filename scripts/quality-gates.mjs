import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Only the latest run of the configured GitHub App can establish readiness. */
export function missingSuccessfulChecks(required, runs) {
  return required.filter(({ context, integration_id }) => {
    const latest = runs.filter((run) => run.name === context && run.app?.id === integration_id)
      .sort((left, right) => right.id - left.id)[0];
    return latest?.status !== 'completed' || latest.conclusion !== 'success';
  }).map(({ context }) => context);
}

export function missingEffectiveRules(expected, effective) {
  const missing = [];
  for (const rule of expected) {
    const candidates = effective.filter(({ type }) => type === rule.type);
    if (rule.type === 'required_status_checks') {
      for (const check of rule.parameters.required_status_checks) {
        if (!candidates.some(({ parameters }) => parameters.strict_required_status_checks_policy &&
          parameters.required_status_checks.some((actual) => actual.context === check.context && actual.integration_id === check.integration_id))) {
          missing.push(check.context);
        }
      }
    } else if (rule.type === 'pull_request') {
      if (!candidates.some(({ parameters }) => parameters.require_code_owner_review && parameters.dismiss_stale_reviews_on_push &&
        parameters.required_approving_review_count >= rule.parameters.required_approving_review_count)) missing.push('Code owner approval');
    } else throw new Error(`Unsupported quality rule: ${rule.type}`);
  }
  return missing;
}

function main() {
  const mode = process.argv[2];
  if (!['check', 'activate', 'verify'].includes(mode)) throw new Error('Usage: node scripts/quality-gates.mjs <check|activate|verify>');
  const repository = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { cwd: root, encoding: 'utf8' }).trim();
  const api = (path, args = [], input) => JSON.parse(execFileSync('gh', ['api', `repos/${repository}/${path}`, ...args], {
    cwd: root, encoding: 'utf8', input,
  }));
  const manifest = JSON.parse(readFileSync(resolve(root, '.github/draken-quality-ruleset.json'), 'utf8'));
  const branches = manifest.conditions.ref_name.include.map((ref) => {
    if (!/^refs\/heads\/[^*?]+$/u.test(ref)) throw new Error('Rollout must name explicit branches; add each branch only when its workflows are ready.');
    return ref.slice('refs/heads/'.length);
  });
  const required = manifest.rules.find(({ type }) => type === 'required_status_checks').parameters.required_status_checks;
  for (const branch of branches) {
    if (mode === 'verify') {
      const missing = missingEffectiveRules(manifest.rules, api(`rules/branches/${encodeURIComponent(branch)}`));
      if (missing.length) throw new Error(`${branch}: missing effective merge requirements: ${missing.join(', ')}`);
    } else {
      const { commit } = api(`branches/${encodeURIComponent(branch)}`);
      const pages = api(`commits/${commit.sha}/check-runs?per_page=100`, ['--paginate', '--slurp']);
      const missing = missingSuccessfulChecks(required, pages.flatMap(({ check_runs }) => check_runs));
      if (missing.length) throw new Error(`${branch}@${commit.sha}: merge the workflows and obtain successful checks before activation: ${missing.join(', ')}`);
      process.stdout.write(`${branch}@${commit.sha}: all required checks have succeeded\n`);
    }
  }
  if (mode === 'activate') {
    const existing = api('rulesets?per_page=100', ['--paginate', '--slurp']).flat();
    if (existing.some(({ name }) => name === manifest.name)) throw new Error('The named ruleset already exists. Run verify and review that ruleset; it will not be overwritten automatically.');
    const created = api('rulesets', ['--method', 'POST', '--input', '-'], JSON.stringify(manifest));
    process.stdout.write(`Created additive ruleset ${created.id}; existing rulesets were preserved. Run the verify command.\n`);
  }
  if (mode === 'verify') process.stdout.write('Effective GitHub merge requirements verified\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
