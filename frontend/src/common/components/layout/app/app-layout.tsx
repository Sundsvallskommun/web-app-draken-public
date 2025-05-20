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
import { ReactNode, useMemo } from 'react';
import 'react-quill/dist/quill.snow.css';
import '../../../../styles/tailwind.scss';
import store from '@supportmanagement/services/storage-service';

dayjs.extend(utc);
dayjs.locale('se');
dayjs.extend(updateLocale);
dayjs.updateLocale('se', {
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

  return (
    <GuiProvider theme={theme} colorScheme={colorScheme}>
      <ConfirmationDialogContextProvider>
        <AppWrapper>
          <LoginGuard>{children}</LoginGuard>
        </AppWrapper>
      </ConfirmationDialogContextProvider>
    </GuiProvider>
  );
};

export default AppLayout;
