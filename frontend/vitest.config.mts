import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: false,
    maxWorkers: 1,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
