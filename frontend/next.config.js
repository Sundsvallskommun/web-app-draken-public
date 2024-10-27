const envalid = require('envalid');

const authDependent = envalid.makeValidator(x => {
  const authEnabled = process.env.HEALTH_AUTH === 'true';

  if (authEnabled && !x.length) {
    throw new Error(`Can't be empty if "HEALTH_AUTH" is true`);
  }

  return x;
})

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
  basePath: process.env.NEXT_PUBLIC_BASEPATH || '',
  experimental: {},
  output: 'standalone',
  i18n: {
    locales: ['sv'],
    defaultLocale: 'sv',
  },
  sassOptions: {
    prependData: `$basePath: '${process.env.NEXT_PUBLIC_BASEPATH || ''}';`,
  },
  async rewrites() {
    return [{ source: '/napi/:path*', destination: '/api/:path*' }]
  },  
  async redirects() {
    return [
      {
        source: '/',
        destination: `${process.env.NEXT_PUBLIC_BASEPATH || ''}/oversikt`,
        basePath: false,
        permanent: false,
      },
    ];
  },
});
