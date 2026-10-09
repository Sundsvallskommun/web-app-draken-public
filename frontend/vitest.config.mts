import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: false,
    maxWorkers: 1,
    // A date read from the service carries an offset and is formatted in the machine
    // timezone, so assertions depend on it. Pin it so CI and local agree.
    env: { TZ: 'Europe/Stockholm' },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
