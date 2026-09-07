/* eslint-disable @typescript-eslint/no-require-imports */
const envalid = require('envalid');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('node:child_process');
const dragons = require('../dragons.json');

// The identity selects one concrete application entrypoint at build time.
const identity = process.env.NEXT_PUBLIC_APPLICATION;
const builtIdentity = process.env.DRAKEN_BUILD_DRAGON || identity;
if (!builtIdentity || !Object.hasOwn(dragons, builtIdentity)) {
  throw new Error(
    'Set DRAKEN_BUILD_DRAGON or a valid NEXT_PUBLIC_APPLICATION from dragons.json before starting Next.js.'
  );
}
if (identity && Object.hasOwn(dragons, identity) && identity !== builtIdentity) {
  throw new Error(`Dragon ${identity} cannot run in a ${builtIdentity} frontend build.`);
}
const dragonEntry = `./src/dragons/${builtIdentity.toLowerCase()}/application.ts`;
if (!fs.existsSync(path.resolve(__dirname, dragonEntry)))
  throw new Error(`Missing frontend entrypoint for ${builtIdentity}`);
const revision =
  process.env.NODE_ENV === 'development'
    ? 'development'
    : process.env.DEPLOY_COMMIT ||
      execFileSync('/usr/bin/git', ['rev-parse', 'HEAD'], {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
      }).trim();
if (revision !== 'development' && !/^[a-f0-9]{40}$/.test(revision))
  throw new Error('DEPLOY_COMMIT must be a full commit SHA');

// Generate raleway.scss from template with correct basePath (Turbopack doesn't support sassOptions.functions)
const stylesDir = path.join(__dirname, 'src', 'styles');
const template = fs.readFileSync(path.join(stylesDir, 'raleway.scss.template'), 'utf8');
fs.writeFileSync(
  path.join(stylesDir, 'raleway.scss'),
  template.replace(/^\$basePath:.*;\n/, `$basePath: '${process.env.NEXT_PUBLIC_BASEPATH || ''}';\n`)
);

const authDependent = envalid.makeValidator((x) => {
  const authEnabled = process.env.HEALTH_AUTH === 'true';

  if (authEnabled && !x.length) {
    throw new Error(`Can't be empty if "HEALTH_AUTH" is true`);
  }

  return x;
});

envalid.cleanEnv(process.env, {
  NEXT_PUBLIC_API_URL: envalid.str(),
  HEALTH_AUTH: envalid.bool(),
  HEALTH_USERNAME: authDependent(),
  HEALTH_PASSWORD: authDependent(),
});

// Routes named `*.dev.tsx` exist only outside production builds. The schema lab is a developer
// sandbox, and a runtime notFound() would still ship its route into every production bundle;
// leaving the extension out of the production list keeps it from being compiled at all.
const DEVELOPMENT_ONLY_PAGE_EXTENSIONS = ['dev.tsx', 'dev.ts'];
const PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];

const developmentDistDir = identity ? `.next-${identity}` : '.next';

module.exports = {
  // Next 16 forwards browser logs through two independent development channels.
  // MCP writes them to disk even when terminal forwarding is disabled.
  logging: { browserToTerminal: false },
  experimental: { mcpServer: false },
  env: {
    DRAKEN_BUILD_DRAGON: builtIdentity,
    DRAKEN_BUILD_DOMAIN: dragons[builtIdentity].domain,
    DRAKEN_BUILD_REVISION: revision,
  },
  allowedDevOrigins: ['dev.test'],
  pageExtensions:
    process.env.NODE_ENV === 'production' ? PAGE_EXTENSIONS : [...DEVELOPMENT_ONLY_PAGE_EXTENSIONS, ...PAGE_EXTENSIONS],
  // Include the shared dragon catalog and keep tracing inside this repository.
  turbopack: {
    root: path.resolve(__dirname, '..'),
    resolveAlias: { '@dragon': dragonEntry },
  },
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  webpack(config) {
    config.resolve.alias['@dragon'] = path.resolve(__dirname, dragonEntry);
    return config;
  },
  distDir: process.env.DOCKER_BUILD === 'true' ? '.next' : developmentDistDir,
  output: 'standalone',
  images: {
    remotePatterns: process.env.DOMAIN_NAME ? [{ protocol: 'https', hostname: process.env.DOMAIN_NAME }] : [],
    formats: ['image/avif', 'image/webp'],
  },
  basePath: process.env.NEXT_PUBLIC_BASEPATH || '',
  async rewrites() {
    return [{ source: '/napi/:path*', destination: '/api/:path*' }];
  },
  // //Note: This is a workaround for JS not working correctly when reloading a page.
  // async headers() {
  //   return [
  //     {
  //       source: '/_next/static/:path*',
  //       headers: [
  //         {
  //           key: 'Cache-Control',
  //           value: 'public, max-age=0, must-revalidate',
  //         },
  //       ],
  //     },
  //   ];
  // },
};
