/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'sv',
    locales: ['sv'],
  },
  defaultNS: 'common',
  fallbackLng: {
    default: ['sv'],
  },
  debug: process.env.NODE_ENV === 'production' ? false : true,
  react: { useSuspense: false },
};
