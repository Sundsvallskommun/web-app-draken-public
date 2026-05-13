/* eslint-disable @typescript-eslint/no-require-imports */
const envalid = require('envalid');
const fs = require('fs');
const path = require('path');

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

module.exports = {
  distDir: process.env.DOCKER_BUILD === 'true' ? '.next' : `.next${process.env.NEXT_PUBLIC_APPLICATION ? `-${process.env.NEXT_PUBLIC_APPLICATION}` : ''}`,
  output: 'standalone',
  images: {
    remotePatterns: process.env.DOMAIN_NAME ? [{ protocol: 'https', hostname: process.env.DOMAIN_NAME }] : [],
    formats: ['image/avif', 'image/webp'],
  },
  basePath: process.env.NEXT_PUBLIC_BASEPATH || '',
  experimental: {
    optimizePackageImports: ['@sk-web-gui/core', '@sk-web-gui/react', 'dayjs'],
  },
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
