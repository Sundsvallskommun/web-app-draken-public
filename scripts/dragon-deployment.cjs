const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const dragons = require('../dragons.json');
const SIDES = new Set(['frontend', 'backend']);
const SECRET_NAMES = new Set([
  'CLIENT_KEY',
  'CLIENT_SECRET',
  'SECRET_KEY',
  'REDIS_PASSWORD',
  'SAML_PRIVATE_KEY',
  'SAML_PUBLIC_KEY',
  'SAML_IDP_PUBLIC_CERT',
  'HEALTH_USERNAME',
  'HEALTH_PASSWORD',
]);
const REQUIRED_SECRETS = ['CLIENT_KEY', 'CLIENT_SECRET', 'SECRET_KEY', 'SAML_PRIVATE_KEY', 'SAML_PUBLIC_KEY', 'SAML_IDP_PUBLIC_CERT'];
const UNSAFE_DEBUG_NAMES = ['DEBUG', 'NODE_DEBUG', 'NODE_DEBUG_NATIVE'];
const RESERVED_NAMES = /^(?:DRAKEN_|DEPLOY_|NEXT_PUBLIC_DEPLOYMENT_ID$|NEXT_PUBLIC_APPLICATION$|APPLICATION$|NODE_ENV$|PORT$)/;
const APPLICATION_PREFIXES = ['NEXT_PUBLIC_', 'SAML_', 'SUPPORTMANAGEMENT_', 'SUPPORT_INVESTIGATION_', 'CASEDATA_', 'HEALTH_', 'SESSION_', 'REDIS_'];
const APPLICATION_NAMES = new Set([
  'AUTHORIZED_GROUPS',
  'ADMIN_GROUP',
  'SUPERADMIN_GROUP',
  'DEVELOPER_GROUP',
  'API_BASE_URL',
  'ADMINPANEL_URL',
  'MUNICIPALITY_ID',
  'DOMAIN',
  'DOMAIN_NAME',
  'BASE_PATH',
  'ADMIN_URL',
  'ORIGIN',
  'BASE_URL_PREFIX',
  'CLIENT_KEY',
  'CLIENT_SECRET',
  'SECRET_KEY',
  'ENVIRONMENT',
  'CREDENTIALS',
  'SWAGGER_ENABLED',
  'LOG_DIR',
  'LOG_RETENTION_DAYS',
]);

function isApplicationName(name) {
  return APPLICATION_NAMES.has(name) || APPLICATION_PREFIXES.some(prefix => name.startsWith(prefix));
}

function fail(message) {
  throw new Error(`Invalid dragon deployment: ${message}`);
}

/** Library debug modes can dump headers, payloads or the child process environment. */
function assertSafeRuntimeEnvironment(environment) {
  if (
    ['NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION', 'NEXT_PUBLIC_USE_AOT_INVESTIGATION'].some(
      name => environment[name] !== undefined && environment[name] !== ''
    )
  ) {
    fail('Retired investigation flags must be migrated before startup');
  }
  if (Object.values(environment).some(value => typeof value === 'string' && value.includes('\0'))) {
    fail('a process environment value contains a null byte');
  }
  for (const name of UNSAFE_DEBUG_NAMES) {
    const value = environment[name];
    if (value !== undefined && typeof value !== 'string') fail(`${name} must be a string`);
    if (value?.trim()) fail(`${name} is not supported; use the application's safe diagnostics`);
  }
}
function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}
function keys(value, allowed, label) {
  if (Object.keys(value).some(key => !allowed.includes(key))) fail(`${label} contains an unsupported field`);
  if (allowed.some(key => !Object.hasOwn(value, key))) fail(`${label} is missing a required field`);
}
function string(value, label, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || /[\0\r\n]/u.test(value)) fail(`${label} must be a single-line string`);
  return value;
}
function url(value, label, production) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be an absolute URL`);
  }
  if (!['https:', ...(production ? [] : ['http:'])].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail(`${label} must use ${production ? 'HTTPS' : 'HTTP(S)'} without credentials, query or fragment`);
  }
  return parsed;
}
// Release keys are ASCII. Preserve their byte order so existing deployment IDs remain valid.
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
        .map(key => [key, sorted(value[key])])
    );
  return value;
}

function validateServiceEnvironment(environment, side) {
  for (const [name, value] of Object.entries(environment)) {
    if (!/^[A-Z][A-Z0-9_]*$/u.test(name) || RESERVED_NAMES.test(name) || SECRET_NAMES.has(name))
      fail(`${side}.environment contains a reserved or secret key`);
    if (['NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION', 'NEXT_PUBLIC_USE_AOT_INVESTIGATION'].includes(name))
      fail('Retired investigation flags must be migrated before deployment');
    if (name === 'NEXT_PUBLIC_IS_CASEDATA' || name === 'NEXT_PUBLIC_IS_SUPPORTMANAGEMENT') fail('domain flags are derived from dragons.json');
    string(value, `${side}.environment.${name}`, true);
  }
}

function validateSecretReferences(secrets, side, release) {
  for (const [name, reference] of Object.entries(secrets)) {
    if (!SECRET_NAMES.has(name) || (side === 'frontend' && !name.startsWith('HEALTH_'))) fail(`${side}.secrets contains an unsupported key`);
    const prefix = `${release.dragon.toLowerCase()}/${release.environment}/`;
    if (typeof reference !== 'string' || !reference.startsWith(prefix) || !/^[a-z0-9-]+\/(test|production)\/[a-z0-9][a-z0-9-]*$/u.test(reference)) {
      fail(`${side}.secrets.${name} must reference this dragon and environment`);
    }
  }
}

function validateService(release, side) {
  const service = record(release[side], side);
  keys(service, ['image', 'port', 'environment', 'secrets'], side);
  if (!Number.isInteger(service.port) || service.port < 1 || service.port > 65535) fail(`${side}.port must be a valid host port`);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9./:_-]*@sha256:[a-f0-9]{64}$/u.test(string(service.image, `${side}.image`)))
    fail(`${side}.image must be pinned by digest`);
  record(service.environment, `${side}.environment`);
  assertSafeRuntimeEnvironment(service.environment);
  record(service.secrets, `${side}.secrets`);
  validateServiceEnvironment(service.environment, side);
  validateSecretReferences(service.secrets, side, release);
}

function validateInvestigationAndLogging(release) {
  const frontend = release.frontend.environment;
  const backend = release.backend.environment;
  if (Object.hasOwn(backend, 'NEXT_PUBLIC_USE_INVESTIGATION'))
    fail('Investigation activation is declared once in frontend.environment and shared with backend');
  if (frontend.NEXT_PUBLIC_USE_INVESTIGATION !== undefined && !['true', 'false'].includes(frontend.NEXT_PUBLIC_USE_INVESTIGATION))
    fail('NEXT_PUBLIC_USE_INVESTIGATION must be true or false');
  if (Object.hasOwn(frontend, 'LOG_RETENTION_DAYS')) fail('LOG_RETENTION_DAYS belongs to backend log files');
  if (
    Object.hasOwn(backend, 'LOG_RETENTION_DAYS') &&
    (!/^[1-9]\d*$/u.test(backend.LOG_RETENTION_DAYS) || !Number.isSafeInteger(Number(backend.LOG_RETENTION_DAYS)))
  ) {
    fail('backend.LOG_RETENTION_DAYS must be a positive integer');
  }
}

function validateServiceIdentity(release) {
  const frontend = release.frontend.environment;
  const backend = release.backend.environment;
  if (release.frontend.port === release.backend.port) fail('frontend and backend host ports must differ');
  for (const name of ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_MUNICIPALITY_ID']) string(frontend[name], `frontend.${name}`);
  for (const name of [
    'API_BASE_URL',
    'MUNICIPALITY_ID',
    'AUTHORIZED_GROUPS',
    'ADMIN_GROUP',
    'DEVELOPER_GROUP',
    'DOMAIN',
    'ORIGIN',
    'BASE_URL_PREFIX',
  ])
    string(backend[name], `backend.${name}`);
  for (const name of REQUIRED_SECRETS) if (!release.backend.secrets[name]) fail(`backend.secrets.${name} is required`);
  if (!/^\d{4}$/u.test(backend.MUNICIPALITY_ID) || frontend.NEXT_PUBLIC_MUNICIPALITY_ID !== backend.MUNICIPALITY_ID)
    fail('municipalities must match');
  const domain = dragons[release.dragon].domain;
  const namespace = domain === 'casedata' ? 'CASEDATA_NAMESPACE' : 'SUPPORTMANAGEMENT_NAMESPACE';
  const other = domain === 'casedata' ? 'SUPPORTMANAGEMENT_NAMESPACE' : 'CASEDATA_NAMESPACE';
  if (!/^[A-Za-z0-9_-]+$/u.test(string(backend[namespace], `backend.${namespace}`))) fail('invalid namespace');
  if (Object.hasOwn(backend, other)) fail('a deployment may configure only its own domain namespace');
  if (domain === 'supportmanagement' && !['stable', 'sprint', 'alktsprint'].includes(backend.SUPPORTMANAGEMENT_API_TARGET))
    fail('explicit SupportManagement API target is required');
}

function validateServiceUrls(release) {
  const frontend = release.frontend.environment;
  const backend = release.backend.environment;
  const production = release.environment === 'production';
  const publicApi = url(frontend.NEXT_PUBLIC_API_URL, 'frontend.NEXT_PUBLIC_API_URL', production);
  url(backend.API_BASE_URL, 'backend.API_BASE_URL', production);
  url(backend.ORIGIN, 'backend.ORIGIN', production);
  if (publicApi.pathname.replace(/\/$/u, '') !== backend.BASE_URL_PREFIX.replace(/\/$/u, ''))
    fail('frontend API prefix must match the backend route prefix');
  const basePath = string(frontend.NEXT_PUBLIC_BASEPATH, 'frontend.NEXT_PUBLIC_BASEPATH', true);
  if (basePath && !/^\/[A-Za-z0-9/_-]+$/u.test(basePath)) fail('invalid frontend base path');
  if (production && (backend.ENVIRONMENT === 'LOCAL' || backend.SESSION_MEMORY === 'true'))
    fail('production cannot use local cookies or memory sessions');
}

/** Reviewed release pairs and their non-secret configuration have one runtime/build owner. */
function validateRelease(value) {
  const release = record(value, 'release');
  keys(release, ['version', 'dragon', 'environment', 'revision', 'configurationVersion', 'dataVolume', 'frontend', 'backend'], 'release');
  if (release.version !== 1 || !Object.hasOwn(dragons, release.dragon)) fail('unknown version or dragon');
  if (!['test', 'production'].includes(release.environment)) fail('environment must be test or production');
  if (typeof release.revision !== 'string' || !/^[a-f0-9]{40}$/u.test(release.revision)) fail('revision must be a full commit SHA');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/u.test(string(release.configurationVersion, 'configurationVersion'))) fail('invalid configurationVersion');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/u.test(string(release.dataVolume, 'dataVolume'))) fail('invalid dataVolume');
  for (const side of SIDES) validateService(release, side);
  validateInvestigationAndLogging(release);
  validateServiceIdentity(release);
  validateServiceUrls(release);
  return release;
}

function readRelease(file) {
  let value;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    fail('release file is missing or invalid JSON');
  }
  return validateRelease(value);
}

function readBuild(file) {
  let build;
  try {
    build = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    fail('immutable build metadata is missing or invalid');
  }
  record(build, 'build');
  if (!Object.hasOwn(dragons, build.id) || typeof build.revision !== 'string' || !/^[a-f0-9]{40}$/u.test(build.revision))
    fail('invalid immutable build identity');
  return { id: build.id, revision: build.revision };
}

function deploymentIdentity(release) {
  validateRelease(release);
  return {
    dragon: release.dragon,
    revision: release.revision,
    deployment: createHash('sha256')
      .update(JSON.stringify(sorted(release)))
      .digest('hex'),
  };
}

function readServiceSecrets(secrets, secretDirectory) {
  const values = {};
  for (const [name, reference] of Object.entries(secrets)) {
    let value;
    try {
      value = readFileSync(resolve(secretDirectory, reference), 'utf8').replace(/\r?\n$/u, '');
    } catch {
      fail(`secret reference for ${name} could not be read`);
    }
    if (!value) fail(`secret reference for ${name} is empty`);
    // Node includes the rejected value in spawn's error for NUL-containing env
    // strings. Reject here without exposing the secret; PEM line breaks are valid.
    if (value.includes('\0')) fail(`secret reference for ${name} contains a null byte`);
    values[name] = value;
  }
  return values;
}

function validateInheritedEnvironment(inherited, managed) {
  for (const [name, value] of Object.entries(inherited)) {
    if (value === undefined) continue;
    if (Object.hasOwn(managed, name) && value !== managed[name]) fail(`runtime value for ${name} differs from the reviewed release`);
    if (isApplicationName(name) && !Object.hasOwn(managed, name)) fail(`runtime value for ${name} is not declared in the release`);
  }
}

function runtimeEnvironment(side, build, release, inherited, secretDirectory) {
  if (!SIDES.has(side)) fail('unknown service');
  assertSafeRuntimeEnvironment(inherited);
  const identity = deploymentIdentity(release);
  if (build.id !== identity.dragon || build.revision !== identity.revision) fail('image identity or revision does not match the release');
  const service = release[side];
  const managed = {
    ...service.environment,
    ...(side === 'backend' ? { NEXT_PUBLIC_USE_INVESTIGATION: release.frontend.environment.NEXT_PUBLIC_USE_INVESTIGATION ?? 'false' } : {}),
    NODE_ENV: 'production',
    PORT: '3000',
    [side === 'frontend' ? 'NEXT_PUBLIC_APPLICATION' : 'APPLICATION']: identity.dragon,
    [side === 'frontend' ? 'NEXT_PUBLIC_DEPLOYMENT_ID' : 'DRAKEN_DEPLOYMENT_ID']: identity.deployment,
  };
  Object.assign(managed, readServiceSecrets(service.secrets, secretDirectory));
  validateInheritedEnvironment(inherited, managed);
  return { ...inherited, ...managed };
}

/** Contains references and public configuration only; secret contents never enter Compose output. */
function composeRelease(release, releaseFile, secretDirectory) {
  const identity = deploymentIdentity(release);
  const services = {};
  for (const side of SIDES) {
    const service = release[side];
    services[side] = {
      image: service.image,
      environment: {
        DRAKEN_DEPLOYMENT_FILE: '/app/deployment.json',
        DRAKEN_SECRET_DIRECTORY: '/run/draken-secrets',
      },
      volumes: [
        { type: 'bind', source: resolve(releaseFile), target: '/app/deployment.json', read_only: true },
        ...Object.values(service.secrets).map(reference => ({
          type: 'bind',
          source: resolve(secretDirectory, reference),
          target: `/run/draken-secrets/${reference}`,
          read_only: true,
        })),
        ...(side === 'backend' ? [{ type: 'volume', source: 'data', target: '/app/backend/data' }] : []),
      ],
      labels: { 'se.sundsvall.draken.deployment': identity.deployment },
      ports: [`127.0.0.1:${service.port}:3000`],
    };
  }
  return {
    name: `draken-${release.dragon.toLowerCase()}-${release.environment}`,
    services,
    volumes: { data: { external: true, name: release.dataVolume } },
  };
}

module.exports = { validateRelease, readRelease, readBuild, deploymentIdentity, runtimeEnvironment, composeRelease, assertSafeRuntimeEnvironment };
