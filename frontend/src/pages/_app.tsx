import LoginGuard from '@common/components/login-guard/login-guard';
import { AppWrapper } from '@common/contexts/app.context';
import { ConfirmationDialogContextProvider, GuiProvider, defaultTheme, extendTheme } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import 'dayjs/locale/se';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import type { AppProps } from 'next/app';
import { useMemo } from 'react';
import 'react-quill/dist/quill.snow.css';
import '../styles/tailwind.scss';

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

function MyApp({ Component, pageProps }: AppProps) {
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

  return (
    <GuiProvider theme={theme}>
      <ConfirmationDialogContextProvider>
        <AppWrapper>
          <LoginGuard>
            <Component {...pageProps} />
          </LoginGuard>
        </AppWrapper>
      </ConfirmationDialogContextProvider>
    </GuiProvider>
  );
}

export default MyApp;
