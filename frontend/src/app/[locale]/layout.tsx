import LocalizationProvider from '@common/components/localization-provider/localization-provider';
import { headers } from 'next/headers';
import { ReactNode } from 'react';

import initLocalization from '../i18n';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/** Lies across every page, above dialogs too, so nobody mistakes the prototype for the real thing. Clicks go through. */
const ConceptWatermark = () => (
  <div
    aria-hidden
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2147483647,
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}
  >
    <span
      style={{
        transform: 'rotate(-20deg)',
        fontSize: '14vw',
        fontWeight: 900,
        letterSpacing: '0.1em',
        color: 'red',
        opacity: 0.06,
        whiteSpace: 'nowrap',
      }}
    >
      PROTOTYP
    </span>
  </div>
);

const namespaces = ['common', 'paths', 'layout', 'login', 'example', 'oversikt', 'registrera', 'messages'];

const LocaleLayout = async ({ children, params }: LocaleLayoutProps) => {
  const { locale } = await params;
  const { resources } = await initLocalization(locale, namespaces);

  return (
    <LocalizationProvider {...{ locale, resources, namespaces }}>
      {children}
      <ConceptWatermark />
    </LocalizationProvider>
  );
};

export const generateMetadata = async ({ params }: LocaleLayoutProps) => {
  const { locale } = await params;
  const { t } = await initLocalization(locale, namespaces);
  const path = (await headers()).get('x-path');

  const pathName = !path
    ? null
    : path
        .replace(/^\/?/, '') // Remove leading slash
        .split('/') // Split into sections
        .map(
          (s) =>
            `${s.substring(0, 1).toUpperCase()}${s.substring(1)}` // Capitalize the first letter
              .replace('-', ' ') // Replace separators
        )
        .join(', '); // Comma separate sections

  const title = path
    ? `${process.env.NEXT_PUBLIC_APPLICATION_NAME} - ${t(`paths:${path}.title`, { defaultValue: pathName })}`
    : process.env.NEXT_PUBLIC_APPLICATION_NAME;
  const description = t(`paths:${path}.description`, { defaultValue: '' });

  return {
    title,
    description,
  };
};

export default LocaleLayout;
