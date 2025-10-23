import LoginGuard from '@components/login-guard/login-guard';
import { ConfirmationDialogContextProvider, GuiProvider } from '@sk-web-gui/react';
import { useLocalStorage } from '@utils/use-localstorage.hook';
import 'dayjs/locale/sv';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function MyApp({ Component, pageProps }: AppProps) {
  const [colorScheme, basePath, setBasePath] = useLocalStorage(
    useShallow((state) => [state.colorScheme, state.basePath, state.setBasePath])
  );

  useEffect(() => {
    const envBasePath = process?.env?.NEXT_PUBLIC_BASE_PATH ?? '';
    if (basePath !== envBasePath) {
      setBasePath(envBasePath);
    }
  }, [basePath, setBasePath]);

  return (
    <GuiProvider colorScheme={colorScheme}>
      <ConfirmationDialogContextProvider>
        <LoginGuard>
          <Component {...pageProps} />
        </LoginGuard>
      </ConfirmationDialogContextProvider>
    </GuiProvider>
  );
}
