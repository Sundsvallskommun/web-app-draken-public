import { defineConfig, devices } from '@playwright/test';

const baseURL = `http://localhost:${process.env.PORT || '3000'}${process.env.NEXT_PUBLIC_BASEPATH || ''}/`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 1024 },
    bypassCSP: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.003,
    },
  },
  projects: [
    {
      name: 'mex',
      testDir: './e2e/case-data/mex',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pt',
      testDir: './e2e/case-data/pt',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'kc',
      testDir: './e2e/kontaktcenter',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'lop',
      testDir: './e2e/lop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer config — start the dev server manually before running tests:
  //   yarn dev:mex   (then yarn test:e2e:mex in another terminal)
  //   yarn dev:pt    (then yarn test:e2e:pt)
  //   etc.
});
