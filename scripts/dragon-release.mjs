import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { composeRelease, deploymentIdentity, readRelease } from './dragon-deployment.cjs';

const [command, file, secretDirectory] = process.argv.slice(2);
try {
  if (!['validate', 'compose', 'verify-images'].includes(command) || !file) {
    throw new Error(
      'Usage: yarn dragon:release <validate|verify-images> <release.json> | yarn dragon:release compose <release.json> <secret-directory>'
    );
  }
  const release = readRelease(file);
  if (command === 'compose') {
    if (!secretDirectory) throw new Error('Specify the directory containing the referenced secret files.');
    process.stdout.write(JSON.stringify(composeRelease(release, resolve(file), resolve(secretDirectory)), null, 2) + '\n');
  } else {
    if (command === 'verify-images') {
      const docker = ['/usr/bin/docker', '/usr/local/bin/docker', '/opt/homebrew/bin/docker'].find(path => existsSync(path));
      if (!docker) throw new Error('Docker must be installed in a standard system directory.');
      for (const side of ['frontend', 'backend']) {
        const [image] = JSON.parse(
          execFileSync(docker, ['image', 'inspect', release[side].image], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
        );
        const labels = image?.Config?.Labels;
        if (
          labels?.['se.sundsvall.draken.id'] !== release.dragon ||
          labels?.['se.sundsvall.draken.service'] !== side ||
          labels?.['org.opencontainers.image.revision'] !== release.revision
        ) {
          throw new Error(`${side} image metadata does not match the reviewed release.`);
        }
      }
    }
    const identity = deploymentIdentity(release);
    process.stdout.write(`${identity.dragon}: ${command} passed (${release.configurationVersion}, ${identity.deployment})\n`);
  }
} catch (error) {
  process.stderr.write(
    (error instanceof Error && !('stderr' in error)
      ? error.message
      : 'Image verification failed; pull the digest-pinned images and check their build metadata.') + '\n'
  );
  process.exitCode = 1;
}
