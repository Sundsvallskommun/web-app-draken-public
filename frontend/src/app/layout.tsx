import '@shell/bootstrap';
import '@styles/tailwind.scss';

import AppLayout from '@common/components/layout/_app';
import { DragonBootstrap } from '@shell/dragon-bootstrap.client';
import { headers } from 'next/headers';
import { ReactNode } from 'react';

import i18nConfig from './i18nConfig';

interface RootLayoutProps {
  children: ReactNode;
  params: Promise<{}>;
}

export const generateStaticParams = () => i18nConfig.locales.map((locale) => ({ locale }));

const RootLayout = async ({ children }: RootLayoutProps) => {
  const headerList = await headers();
  const path = headerList.get('x-path') ?? '';

  const validLocale = i18nConfig.locales.find((locale) => path.startsWith(`/${locale}/`) || path === `/${locale}`);
  const locale = validLocale ?? i18nConfig.defaultLocale;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        {/*
          The dragon is composed twice on purpose. `import '@shell/bootstrap'` above runs in the
          server-component module graph; client components are bundled into a separate graph (SSR
          pass and browser), where a module-level singleton set by the server graph does not exist.
          DragonBootstrap imports the same module there, and renders before AppLayout so nothing
          under it can read an unconfigured policy. See src/shell/README.md.
        */}
        <DragonBootstrap />
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
};

export default RootLayout;
