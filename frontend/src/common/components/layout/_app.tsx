'use client';

import LoginGuard from '@common/components/login-guard/login-guard';
import { AppWrapper } from '@common/contexts/app.context';
import {
  ColorSchemeMode,
  ConfirmationDialogContextProvider,
  GuiProvider,
  defaultTheme,
  extendTheme,
} from '@sk-web-gui/react';
import dayjs from 'dayjs';
import 'dayjs/locale/se';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import type { AppProps } from 'next/app';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import '@styles/tailwind.scss';
import store from '@supportmanagement/services/storage-service';
import { appWithTranslation } from 'next-i18next';
import nextI18NextConfig from '../../../../next-i18next.config';
import { getMe } from '@common/services/user-service';
import LoaderFullScreen from '../loader/loader-fullscreen';

dayjs.extend(utc);
dayjs.locale('sv');
dayjs.extend(updateLocale);
dayjs.updateLocale('sv', {
  months: [
    'Januari',
    'Februari',
    'Mars',
    'April',
    'Maj',
    'Juni',
    'Juli',
    'Augusti',
    'September',
    'Oktober',
    'November',
    'December',
  ],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
});

interface ClientApplicationProps {
  children: ReactNode;
}

function AppLayout({ children }: ClientApplicationProps) {
  const colorScheme = store.get('colorScheme') as ColorSchemeMode;
  const [mounted, setMounted] = useState(false);
  const theme = useMemo(
    () =>
      extendTheme({
        colorSchemes: defaultTheme.colorSchemes,
        spacing: {
          ...defaultTheme.spacing,
          'max-content': '1440px',
        },
      }),
    []
  );

  useEffect(() => {
    getMe();
    setMounted(true);
  }, [setMounted]);

  if (!mounted) {
    return <LoaderFullScreen />;
  }

  return (
    // <GuiProvider theme={theme} colorScheme={colorScheme}>
    //   <ConfirmationDialogContextProvider>
    //     <AppWrapper>
    //       <LoginGuard>{children}</LoginGuard>
    //     </AppWrapper>
    //   </ConfirmationDialogContextProvider>
    // </GuiProvider>
    <GuiProvider theme={theme} colorScheme={colorScheme as ColorSchemeMode}>
      <ConfirmationDialogContextProvider>
        <AppWrapper>{children}</AppWrapper>
      </ConfirmationDialogContextProvider>
    </GuiProvider>
  );
}

export default AppLayout;
