'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFeatureFlags } from '@common/services/feature-flag-service';
import { getMe, getAdminUsers } from '@common/services/user-service';
import { useUserStore } from '@stores/user-store';
import { useConfigStore } from '@stores/config-store';
import { useMetadataStore } from '@stores/metadata-store';
import { useFeatureFlagStore } from '@stores/feature-flag-store';
import { appConfig, applyRuntimeFeatureFlags } from '@config/appconfig';
import {
  ColorSchemeMode,
  ConfirmationDialogContextProvider,
  GuiProvider,
  defaultTheme,
  extendTheme,
} from '@sk-web-gui/react';
import store from '@supportmanagement/services/storage-service';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import dayjs from 'dayjs';
import 'dayjs/locale/se';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import { ReactNode, useEffect, useMemo, useState } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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

function AppInitializer({ children }: { children: ReactNode }) {
  useEffect(() => {
    const municipalityId = process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '';
    useConfigStore.getState().setMunicipalityId(municipalityId);

    getMe()
      .then((user) => {
        useUserStore.getState().setUser(user);
      })
      .catch(() => {});

    getFeatureFlags()
      .then((res) => {
        applyRuntimeFeatureFlags(res.data);
        useFeatureFlagStore.getState().applyFlags(res.data);
      })
      .catch(() => {});

    getAdminUsers()
      .then((data) => {
        useUserStore.getState().setAdministrators(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (appConfig.isSupportManagement && process.env.NEXT_PUBLIC_MUNICIPALITY_ID) {
      getSupportMetadata(process.env.NEXT_PUBLIC_MUNICIPALITY_ID).then((res) => {
        useMetadataStore.getState().setSupportMetadata(res.metadata);
      });
    }
  }, []);

  return <>{children}</>;
}

function AppLayout({ children }: ClientApplicationProps) {
  const [colorScheme, setColorScheme] = useState<ColorSchemeMode>(ColorSchemeMode.Light);
  const theme = useMemo(
    () =>
      extendTheme({
        colorSchemes: defaultTheme.colorSchemes,
        spacing: {
          ...defaultTheme.spacing,
          'max-content': '1440px',
        },
        screens: { ...defaultTheme.screens, 'medium-device-max': '800px', 'large-device-max': '960px' },
      }),
    []
  );

  useEffect(() => {
    const saved = store.get('colorScheme') as ColorSchemeMode;
    if (saved) {
      setColorScheme(saved);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GuiProvider theme={theme} colorScheme={colorScheme}>
        <ConfirmationDialogContextProvider>
          <AppInitializer>{children}</AppInitializer>
        </ConfirmationDialogContextProvider>
      </GuiProvider>
    </QueryClientProvider>
  );
}

export default AppLayout;
