'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import 'dayjs/locale/sv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import updateLocale from 'dayjs/plugin/updateLocale';
import {
  ColorSchemeMode,
  ConfirmationDialogContextProvider,
  defaultTheme,
  extendTheme,
  GuiProvider,
  Spinner,
} from '@sk-web-gui/react';
import { getMe } from '@common/services/user-service';

import store from '@supportmanagement/services/storage-service';
import { appWithTranslation } from 'next-i18next';
import nextI18NextConfig from '../../next-i18next.config';
import { AppWrapper } from '@contexts/app.context';
import LoginGuard from '../login-guard/login-guard';

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

const AppLayout = ({ children }: ClientApplicationProps) => {
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

  const colorScheme = store.get('colorScheme') as ColorSchemeMode;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    getMe();
    setMounted(true);
  }, [getMe, setMounted]);

  if (!mounted) {
    return <Spinner size={10} />;
  }

  return (
    <GuiProvider colorScheme={colorScheme}>
      <ConfirmationDialogContextProvider>
        <AppWrapper>
          <LoginGuard>{children}</LoginGuard>
        </AppWrapper>
      </ConfirmationDialogContextProvider>
    </GuiProvider>
  );
};

export default appWithTranslation(MyApp, nextI18NextConfig);
