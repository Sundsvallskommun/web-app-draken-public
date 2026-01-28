/* eslint-disable @typescript-eslint/no-require-imports */
const envalid = require('envalid');
const nodeSass = require('sass');

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

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  distDir: `.next${process.env.NEXT_PUBLIC_APPLICATION ? `-${process.env.NEXT_PUBLIC_APPLICATION}` : ''}`,
  output: 'standalone',
  images: {
    domains: [process.env.DOMAIN_NAME],
    formats: ['image/avif', 'image/webp'],
  },
  basePath: process.env.NEXT_PUBLIC_BASEPATH || '',
  sassOptions: {
    functions: {
      'env($variable)': (variable) => {
        const value = variable.getValue();
        const envValue = process.env[value];
        const sassValue = new nodeSass.SassString(envValue);
        return sassValue;
      },
    },
  },
  transpilePackages: [],
  async rewrites() {
    return [{ source: '/napi/:path*', destination: '/api/:path*' }];
  },
});
