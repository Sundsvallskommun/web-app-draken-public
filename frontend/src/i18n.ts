import { createInstance, i18n, Resource } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';

const i18nConfig = {
  locales: ['sv'],
  defaultLocale: 'sv',
};

const namespaces = ['common', 'paths', 'layout', 'login', 'example', 'oversikt', 'registrera', 'messages'];

const initLocalization = async (locale: string, ns: string[], i18nInstance?: i18n, resources?: Resource) => {
  i18nInstance = i18nInstance || createInstance();

  i18nInstance.use(initReactI18next);

  if (!resources) {
    i18nInstance.use(
      resourcesToBackend(
        (language: string, namespace: string) => import(`../public/locales/${language}/${namespace}.json`)
      )
    );
  }

  await i18nInstance.init({
    lng: locale,
    resources,
    fallbackLng: i18nConfig.defaultLocale,
    supportedLngs: i18nConfig.locales,
    defaultNS: ns[0],
    fallbackNS: ns[0],
    ns,
    preload: resources ? [] : i18nConfig.locales,
    initImmediate: false,
  });

  return {
    i18n: i18nInstance,
    resources: i18nInstance.services.resourceStore.data,
    t: i18nInstance.t,
  };
};

export { i18nConfig, namespaces };
export default initLocalization;
