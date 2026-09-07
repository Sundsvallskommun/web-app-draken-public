import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { composeRelease, deploymentIdentity, runtimeEnvironment } from './dragon-deployment.cjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dragons = JSON.parse(await readFile(join(root, 'dragons.json'), 'utf8'));
const example = JSON.parse(await readFile(join(root, 'deployments/example-iaf-test.json'), 'utf8'));
const execute = promisify(execFile);
const interrupted = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => interrupted.abort());

async function command(binary, args, { allowFailure = false, cleanup = false, timeout = 60_000 } = {}) {
  try {
    const result = await execute(binary, args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
      timeout,
      ...(cleanup ? {} : { signal: interrupted.signal }),
    });
    return { ...result, code: 0 };
  } catch (error) {
    if (allowFailure && Number.isInteger(error.code)) return { stdout: error.stdout, stderr: error.stderr, code: error.code };
    throw new Error(`${binary} failed: ${error.stderr || error.message}`);
  }
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { port: address.port, release: () => (server.listening ? new Promise(resolveClose => server.close(resolveClose)) : Promise.resolve()) };
}

function releaseFor(id, revision, basePath, frontendPort, backendPort, dataVolume) {
  const release = structuredClone(example);
  const definition = dragons[id];
  release.dragon = id;
  release.revision = revision;
  release.dataVolume = dataVolume;
  release.frontend.port = frontendPort;
  release.backend.port = backendPort;
  release.configurationVersion = `container-smoke-${id.toLowerCase()}-${basePath ? 'prefixed' : 'root'}`;
  const apiPrefix = `${basePath}/api`;
  const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
  const backendOrigin = `http://127.0.0.1:${backendPort}`;
  release.frontend.environment = {
    NEXT_PUBLIC_API_URL: `${backendOrigin}${apiPrefix}`,
    NEXT_PUBLIC_BASEPATH: basePath,
    NEXT_PUBLIC_MUNICIPALITY_ID: '2281',
    NEXT_PUBLIC_APPLICATION_NAME: `Container smoke ${id}`,
    NEXT_PUBLIC_ENVIRONMENT: 'TEST',
    NEXT_PUBLIC_PROTECTED_ROUTES: '',
    NEXT_PUBLIC_USE_INVESTIGATION: String(['IAF', 'VOF', 'AOT'].includes(id)),
    NEXT_PUBLIC_USE_THREE_LEVEL_CATEGORIZATION: String(['IAF', 'VOF'].includes(id)),
    HEALTH_AUTH: 'false',
  };
  release.backend.environment = {
    API_BASE_URL: 'http://127.0.0.1:9',
    MUNICIPALITY_ID: '2281',
    BASE_URL_PREFIX: apiPrefix,
    DOMAIN: 'smoke.example.invalid',
    ORIGIN: frontendOrigin,
    AUTHORIZED_GROUPS: 'smoke-authorized',
    ADMIN_GROUP: 'smoke-admin',
    SUPERADMIN_GROUP: 'smoke-superadmin',
    DEVELOPER_GROUP: 'smoke-developer',
    SAML_CALLBACK_URL: `${backendOrigin}${apiPrefix}/saml/login/callback`,
    SAML_LOGOUT_CALLBACK_URL: `${backendOrigin}${apiPrefix}/saml/logout/callback`,
    SAML_SUCCESS_REDIRECT: `${frontendOrigin}${basePath}/oversikt`,
    SAML_FAILURE_REDIRECT: `${frontendOrigin}${basePath}/login`,
    SAML_FAILURE_REDIRECT_MESSAGE: `${frontendOrigin}${basePath}/login`,
    SAML_ENTRY_SSO: 'http://127.0.0.1:9/sso',
    SAML_ISSUER: `${backendOrigin}${apiPrefix}`,
    LOG_DIR: '../../data/logs',
    CREDENTIALS: 'true',
    ENVIRONMENT: 'LOCAL',
  };
  if (definition.domain === 'casedata') {
    Object.assign(release.backend.environment, {
      CASEDATA_NAMESPACE: `SMOKE_${id}`,
      CASEDATA_SENDER_EMAIL: 'sender@example.invalid',
      CASEDATA_REPLY_TO: 'reply@example.invalid',
      CASEDATA_SENDER: 'Container smoke',
      CASEDATA_SENDER_SMS: 'Smoke',
    });
  } else {
    Object.assign(release.backend.environment, {
      SUPPORTMANAGEMENT_NAMESPACE: id === 'KC' ? 'CONTACTSUNDSVALL' : `SMOKE_${id}`,
      SUPPORTMANAGEMENT_API_TARGET: ['IAF', 'VOF'].includes(id) ? 'sprint' : 'stable',
      SUPPORTMANAGEMENT_TEST_EMAIL: 'test@example.invalid',
      SUPPORTMANAGEMENT_SENDER_EMAIL: 'sender@example.invalid',
      SUPPORTMANAGEMENT_SENDER_SMS: 'Smoke',
    });
  }
  for (const side of ['frontend', 'backend']) {
    release[side].secrets = Object.fromEntries(
      Object.entries(release[side].secrets).map(([name, reference]) => [name, `${id.toLowerCase()}/test/${reference.split('/').at(-1)}`])
    );
  }
  deploymentIdentity(release);
  return release;
}

async function createSecrets(directory, release, key, certificate) {
  for (const [name, reference] of Object.entries(release.backend.secrets)) {
    let value = randomBytes(32).toString('hex');
    if (name === 'SAML_PRIVATE_KEY') value = key;
    else if (name === 'SAML_PUBLIC_KEY' || name === 'SAML_IDP_PUBLIC_CERT') value = certificate;
    const file = join(directory, reference);
    await mkdir(dirname(file), { recursive: true });
    // The enclosing temp directory is private. Read-only bind-mounted synthetic
    // files must also be readable by each image's unprivileged runtime user.
    await writeFile(file, value, { mode: 0o444, flag: 'wx' }).catch(error => {
      if (error.code !== 'EEXIST') throw error;
    });
  }
}

async function waitForHttp(url, label) {
  const deadline = Date.now() + 60_000;
  let last = 'not listening';
  while (Date.now() < deadline && !interrupted.signal.aborted) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      const body = await response.text();
      if (response.status === 200) return { response, body };
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.code || error.name;
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  throw new Error(`${label} did not become ready (${last})`);
}

async function verifyHttpPair(release, basePath) {
  const backendOrigin = `http://127.0.0.1:${release.backend.port}`;
  const frontendOrigin = `http://127.0.0.1:${release.frontend.port}`;
  await waitForHttp(`${backendOrigin}/health`, 'backend');
  const { response: page, body: html } = await waitForHttp(`${frontendOrigin}${basePath}/login`, 'frontend login');
  assert.match(page.headers.get('content-type') ?? '', /text\/html/u);
  assert.match(html, /<html/u);
  const assetPath = [...html.matchAll(/(?:src|href)="([^"\s]*\/_next\/[^"\s]+)"/gu)].map(match => match[1])[0];
  assert.ok(assetPath, 'login page must reference a built Next.js asset');
  const asset = new URL(assetPath, frontendOrigin);
  assert.equal(asset.origin, frontendOrigin, 'asset must remain local');
  assert.ok(asset.pathname.startsWith(`${basePath}/_next/`), 'asset path must respect the configured base path');
  assert.equal((await fetch(asset, { signal: AbortSignal.timeout(5_000) })).status, 200, 'built frontend asset must be served');

  const identity = deploymentIdentity(release);
  const headers = {
    'X-Draken-Dragon': identity.dragon,
    'X-Draken-Revision': identity.revision,
    'X-Draken-Deployment': identity.deployment,
    Origin: frontendOrigin,
  };
  const publicRoot = `${backendOrigin}${basePath}/api/`;
  const matching = await fetch(publicRoot, { headers, signal: AbortSignal.timeout(5_000) });
  assert.equal(matching.status, 200, 'matching frontend identity must reach the public controller');
  assert.equal(await matching.text(), 'OK');
  assert.equal(matching.headers.get('access-control-allow-origin'), frontendOrigin);
  for (const incompatible of [{}, { ...headers, 'X-Draken-Deployment': 'stale-frontend' }]) {
    const mismatch = await fetch(publicRoot, { headers: incompatible, signal: AbortSignal.timeout(5_000) });
    assert.equal(mismatch.status, 409, 'missing or stale frontend identity must be rejected');
    assert.equal((await mismatch.json()).code, 'DRAKEN_DEPLOYMENT_MISMATCH');
  }
}

async function verifyStartupRejections(compose, release, releaseFile, secretDirectory, key, certificate, basePath) {
  const id = release.dragon;
  const revision = release.revision;
  // These one-off containers use the real image startup, not an overridden
  // command. They share only this smoke test's isolated volume and secrets.
  const rejectStartup = async (side, description, args = []) => {
    const result = await compose(['run', '--rm', '--no-deps', ...args, side], { allowFailure: true, timeout: 20_000 });
    assert.notEqual(result.code, 0, `${side} must reject ${description}`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /Invalid dragon deployment|immutable image identity/u,
      `${side} must fail because of deployment validation`
    );
  };
  const alteredRevision = `${revision[0] === '0' ? '1' : '0'}${revision.slice(1)}`;
  await writeFile(releaseFile, JSON.stringify({ ...release, revision: alteredRevision }));
  for (const side of ['frontend', 'backend']) await rejectStartup(side, 'a different image revision');

  const otherId = id === 'KC' ? 'IAF' : 'KC';
  const otherDragon = releaseFor(otherId, release.revision, basePath, release.frontend.port, release.backend.port, release.dataVolume);
  await createSecrets(secretDirectory, otherDragon, key, certificate);
  await writeFile(releaseFile, JSON.stringify(otherDragon));
  for (const side of ['frontend', 'backend']) await rejectStartup(side, 'a different image dragon');

  await writeFile(releaseFile, JSON.stringify(release));
  const namespace = dragons[id].domain === 'casedata' ? 'CASEDATA_NAMESPACE' : 'SUPPORTMANAGEMENT_NAMESPACE';
  await rejectStartup('backend', 'an unreviewed namespace override', ['-e', `${namespace}=SMOKE_WRONG_NAMESPACE`]);
}

function smokeConfiguration(release, releaseFile, secretDirectory, images, project) {
  for (const side of ['frontend', 'backend'])
    runtimeEnvironment(side, { id: release.dragon, revision: release.revision }, release, {}, secretDirectory);
  const configuration = composeRelease(release, releaseFile, secretDirectory);
  configuration.name = project;
  for (const side of ['frontend', 'backend']) {
    configuration.services[side].image = images[side];
    configuration.services[side].pull_policy = 'never';
    configuration.services[side].ports = [`127.0.0.1:${release[side].port}:3000`];
  }
  return configuration;
}

async function main() {
  const [requestedId, frontendImage, backendImage, revision] = process.argv.slice(2);
  const id = requestedId?.toUpperCase();
  assert.ok(
    id && Object.hasOwn(dragons, id) && frontendImage && backendImage && /^[a-f0-9]{40}$/u.test(revision ?? ''),
    'Usage: node scripts/dragon-container-smoke.mjs <DRAGON> <frontend-image> <backend-image> <revision>'
  );
  const images = { frontend: frontendImage, backend: backendImage };
  for (const [side, tag] of Object.entries(images)) {
    const result = await command('docker', ['image', 'inspect', tag]);
    const [image] = JSON.parse(result.stdout);
    const labels = image.Config.Labels;
    assert.equal(labels['se.sundsvall.draken.id'], id, `${side} image dragon label`);
    assert.equal(labels['se.sundsvall.draken.service'], side, `${side} image service label`);
    assert.equal(labels['org.opencontainers.image.revision'], revision, `${side} image revision label`);
  }

  const temporary = await mkdtemp(join(tmpdir(), 'draken-container-smoke-'));
  const project = `draken-smoke-${id.toLowerCase()}-${randomBytes(5).toString('hex')}`;
  const composeFile = join(temporary, 'compose.json');
  const secretDirectory = join(temporary, 'secrets');
  const dataVolume = `${project}-data`;
  const reservations = [];
  let composeCreated = false;
  let volumeCreated = false;
  const compose = (args, options) => command('docker', ['compose', '-p', project, '-f', composeFile, ...args], options);

  try {
    await command('docker', ['volume', 'create', dataVolume]);
    volumeCreated = true;
    await command('openssl', [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=smoke.example.invalid',
      '-keyout',
      join(temporary, 'key.pem'),
      '-out',
      join(temporary, 'certificate.pem'),
    ]);
    const key = await readFile(join(temporary, 'key.pem'), 'utf8');
    const certificate = await readFile(join(temporary, 'certificate.pem'), 'utf8');
    await chmod(temporary, 0o700);

    for (const basePath of ['', `/smoke-${id.toLowerCase()}`]) {
      const frontend = await reservePort();
      reservations.push(frontend);
      const backend = await reservePort();
      reservations.push(backend);
      const release = releaseFor(id, revision, basePath, frontend.port, backend.port, dataVolume);
      const releaseFile = join(temporary, `release-${basePath ? 'prefixed' : 'root'}.json`);
      await createSecrets(secretDirectory, release, key, certificate);
      await writeFile(releaseFile, JSON.stringify(release));
      const configuration = smokeConfiguration(release, releaseFile, secretDirectory, images, project);
      await writeFile(composeFile, JSON.stringify(configuration));
      composeCreated = true;
      await Promise.all([frontend.release(), backend.release()]);

      process.stdout.write(`${id}: starting isolated container pair (base path ${basePath || '/'})\n`);
      await compose(['up', '--detach', '--pull', 'never']);
      await verifyHttpPair(release, basePath);

      await verifyStartupRejections(compose, release, releaseFile, secretDirectory, key, certificate, basePath);
      await compose(['down', '--volumes', '--remove-orphans']);
      process.stdout.write(`${id}: real frontend/backend, assets, compatibility checks and startup rejection passed (${basePath || '/'})\n`);
    }
  } catch (error) {
    if (composeCreated) {
      const logs = await compose(['logs', '--no-color', '--tail', '50'], { allowFailure: true, cleanup: true }).catch(() => undefined);
      if (logs) process.stderr.write(`${logs.stdout}\n${logs.stderr}`);
    }
    throw error;
  } finally {
    try {
      if (composeCreated) await compose(['down', '--volumes', '--remove-orphans'], { cleanup: true, allowFailure: true });
      if (volumeCreated) await command('docker', ['volume', 'rm', dataVolume], { cleanup: true });
    } finally {
      await Promise.all(reservations.map(reservation => reservation.release()));
      await rm(temporary, { recursive: true, force: true });
    }
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
