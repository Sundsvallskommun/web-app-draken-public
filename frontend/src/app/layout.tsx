import AppLayout from '@common/components/layout/app/app-layout';
import i18nConfig from './i18nConfig';
import { ReactNode } from 'react';

export const generateStaticParams = () => i18nConfig.locales.map((locale) => ({ locale }));

interface RootLayoutProps {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}

async function MyApp({ children, params }: RootLayoutProps) {
  const { locale } = await params;

  console.log(generateStaticParams()[0].locale);
  return (
    <html lang={'sv'}>
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

export default MyApp;
