import '../styles/tailwind.scss';
import { ReactNode } from 'react';
import MyApp from '@common/components/layout/app-layout';

interface RootLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

const RootLayout = async ({ children, params }: RootLayoutProps) => {
  const { locale } = await params;
  return (
    <html lang="sv">
      <body>
        <MyApp>{children}</MyApp>
      </body>
    </html>
  );
};

export default RootLayout;
