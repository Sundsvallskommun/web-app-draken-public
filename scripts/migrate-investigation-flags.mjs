import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const variants = { avvikelse: 'useAvvikelseInvestigation', aot: 'useAotInvestigation' };
const environmentKeys = ['NEXT_PUBLIC_USE_INVESTIGATION', 'NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION', 'NEXT_PUBLIC_USE_AOT_INVESTIGATION'];
const reject = () => { throw new Error('Invalid migration input; supply one application/namespace, its old environment flags and an Adminpanel flags export.'); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Offline, scoped migration. It never contacts Adminpanel or reads secrets. */
export function migrateInvestigationFlags(input) {
  if (!record(input) || ![1, 2].includes(input.version) || typeof input.application !== 'string' || !/^[A-Z][A-Z0-9]*$/u.test(input.application) || typeof input.namespace !== 'string' || !input.namespace.trim() ||
      ![...Object.keys(variants), 'none'].includes(input.implementation) || !record(input.environment) || !Array.isArray(input.flags)) reject();
  if (Object.keys(input.environment).some(name => !environmentKeys.includes(name))) reject();
  for (const value of Object.values(input.environment)) if (!['true', 'false', ''].includes(value)) reject();
  for (const flag of input.flags) {
    if (!record(flag) || typeof flag.name !== 'string' || typeof flag.application !== 'string' || typeof flag.namespace !== 'string' || typeof flag.enabled !== 'boolean') reject();
  }
  const belongs = flag => flag.application === input.application && flag.namespace === input.namespace;
  const scoped = input.flags.filter(belongs);
  if (new Set(scoped.map(flag => flag.name)).size !== scoped.length) reject();
  const selected = variants[input.implementation];
  const envVariant = input.implementation === 'avvikelse' ? environmentKeys[1] : environmentKeys[2];
  const hasOldEnvironment = environmentKeys.slice(1).some(name => Object.hasOwn(input.environment, name));
  const hasOldRows = scoped.some(flag => Object.values(variants).includes(flag.name));
  if (input.version === 2 && (hasOldEnvironment || hasOldRows)) reject();
  const environmentEnabled = input.environment.NEXT_PUBLIC_USE_INVESTIGATION === 'true' && input.implementation !== 'none' &&
    (input.version === 2 || input.environment[envVariant] === 'true');
  const master = scoped.find(flag => flag.name === 'useInvestigation');
  const enabled = scoped.length ? Boolean(master?.enabled && input.implementation !== 'none' && (input.version === 2 || scoped.find(flag => flag.name === selected)?.enabled)) : environmentEnabled;
  // Version 1 preserves the old conjunction, including missing=false. Version 2
  // makes rerunning an already migrated proposal safe without guessing its origin.
  const flags = input.flags.filter(flag => !belongs(flag) || !Object.values(variants).includes(flag.name))
    .map(flag => belongs(flag) && flag.name === 'useInvestigation' ? { ...flag, enabled } : flag);
  if (scoped.length && !master) flags.push({ application: input.application, namespace: input.namespace, name: 'useInvestigation', enabled });
  return {
    ...input,
    version: 2,
    environment: { NEXT_PUBLIC_USE_INVESTIGATION: String(environmentEnabled) },
    flags,
    effectiveInvestigationEnabled: enabled,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [, , source, destination] = process.argv;
    if (!source || !destination || resolve(source) === resolve(destination)) throw new Error('Usage: node scripts/migrate-investigation-flags.mjs input.json output.json');
    const migrated = migrateInvestigationFlags(JSON.parse(readFileSync(source, 'utf8')));
    writeFileSync(destination, JSON.stringify(migrated, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write('Migration proposal written. Review and apply during the approved deployment; no remote settings were changed.\n');
  } catch (error) {
    process.stderr.write(error instanceof SyntaxError ? 'Migration input is not valid JSON.\n' : error?.code ? 'Migration file could not be read or created.\n' : `${error.message}\n`);
    process.exitCode = 1;
  }
}
