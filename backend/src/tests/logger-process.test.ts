import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const privateValue = 'synthetic-private-case-and-token';
const runChild = async (source: string, directory: string, retentionDays?: string) => {
  const env: NodeJS.ProcessEnv = { ...process.env, LOG_DIR: directory, NODE_ENV: 'production' };
  delete env.LOG_RETENTION_DAYS;
  if (retentionDays !== undefined) env.LOG_RETENTION_DAYS = retentionDays;
  const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', '-e', source], { cwd: process.cwd(), env });
  let output = '';
  child.stdout.on('data', chunk => {
    output += String(chunk);
  });
  child.stderr.on('data', chunk => {
    output += String(chunk);
  });
  const timeout = setTimeout(() => child.kill('SIGKILL'), 8000);
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timeout);
      resolve({ code, output });
    });
  });
};

it.each([
  ['uncaught_exception', `setImmediate(() => { throw new Error('${privateValue}'); });`],
  ['unhandled_rejection', `Promise.reject(new Error('${privateValue}'));`],
  [
    'unhandled_rejection',
    `const error = Object.defineProperty({}, 'message', { get() { throw new Error('${privateValue}'); } }); Promise.reject(error);`,
  ],
])(
  'emits a safe process.%s record, flushes files and exits unsuccessfully',
  async (event, trigger) => {
    const temporary = await mkdtemp(join(tmpdir(), 'draken-fatal-'));
    const directory = join(temporary, 'logs');
    try {
      const result = await runChild(`require('./src/utils/logger'); ${trigger}`, directory);
      expect(result.code).toBe(1);
      expect(result.output).not.toContain(privateValue);
      const outputRecords = result.output
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      expect(outputRecords).toContainEqual(expect.objectContaining({ event: `process.${event}`, level: 'error', errorKind: 'fatal' }));
      expect((await stat(directory)).mode & 0o777).toBe(0o700);
      for (const subdirectory of ['debug', 'error']) {
        expect((await stat(join(directory, subdirectory))).mode & 0o777).toBe(0o700);
        const files = await readdir(join(directory, subdirectory));
        const logFiles = files.filter(file => file.endsWith('.log'));
        expect(logFiles.length).toBeGreaterThan(0);
        for (const file of logFiles) {
          const filePath = join(directory, subdirectory, file);
          expect((await stat(filePath)).mode & 0o777).toBe(0o600);
          const contents = await readFile(filePath, 'utf8');
          expect(contents).toContain(`process.${event}`);
          expect(contents).not.toContain(privateValue);
        }
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  },
  10000,
);

it.each([
  [undefined, 30],
  ['14', '14d'],
] as const)('uses the configured rotation policy (%s) without inventing a default duration', async (days, expected) => {
  const temporary = await mkdtemp(join(tmpdir(), 'draken-retention-'));
  try {
    const result = await runChild(
      `const { logger } = require('./src/utils/logger'); const policies = logger.transports.filter(t => t.options && t.options.maxFiles).map(t => t.options.maxFiles); process.stdout.write(JSON.stringify(policies)); logger.close();`,
      temporary,
      days,
    );
    expect(result.code).toBe(0);
    expect(JSON.parse(result.output)).toEqual([expected, expected]);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

it('routes real session-file-store retry diagnostics through the safe owner', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'draken-session-privacy-'));
  try {
    const result = await runChild(
      `require('tsconfig-paths/register');
       process.env.REDIS_HOST = '';
       const { createSessionStore } = require('./src/utils/session-store');
       const { logger } = require('./src/utils/logger');
       process.chdir(${JSON.stringify(temporary)});
       createSessionStore().then(store => store.get('${privateValue}', () => logger.close()));`,
      join(temporary, 'logs'),
    );
    expect(result.code).toBe(0);
    expect(result.output).toContain('Session file store reported a diagnostic');
    expect(result.output).not.toContain(privateValue);
    expect(result.output).not.toContain(temporary);
    for (const line of result.output.trim().split('\n')) expect(JSON.parse(line)).toHaveProperty('event');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
