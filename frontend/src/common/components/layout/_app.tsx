import { getFeatureFlags } from '@common/services/feature-flag-service';
import { getAdminUsers, getMe } from '@common/services/user-service';
import { appConfig, applyRuntimeFeatureFlags } from '@config/appconfig';
import {
  ColorSchemeMode,
  ConfirmationDialogContextProvider,
  defaultTheme,
  extendTheme,
  GuiProvider,
} from '@sk-web-gui/react';
import { useConfigStore } from '@stores/config-store';
import { useMetadataStore } from '@stores/metadata-store';
import { useUiSettingsStore } from '@stores/ui-settings-store';
import { useUserStore } from '@stores/user-store';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import { ReactNode, useEffect, useMemo, useSyncExternalStore } from 'react';


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

function AppInitializer({ children }: Readonly<{ children: ReactNode }>) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const municipalityId = import.meta.env.VITE_MUNICIPALITY_ID || '';
    useConfigStore.getState().setMunicipalityId(municipalityId);

    getMe()
      .then((user) => {
        useUserStore.getState().setUser(user);
      })
      .catch(() => {});

    getFeatureFlags()
      .then((res) => {
        applyRuntimeFeatureFlags(res.data);
      })
      .catch(() => {});

    getAdminUsers()
      .then((data) => {
        useUserStore.getState().setAdministrators(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (appConfig.isSupportManagement && import.meta.env.VITE_MUNICIPALITY_ID) {
      getSupportMetadata(import.meta.env.VITE_MUNICIPALITY_ID).then((res) => {
        useMetadataStore.getState().setSupportMetadata(res.metadata);
      });
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}

function AppLayout({ children }: ClientApplicationProps) {
  const colorScheme = useSyncExternalStore(
    useUiSettingsStore.subscribe,
    () => (useUiSettingsStore.getState().colorScheme as ColorSchemeMode) || ColorSchemeMode.Light,
    () => ColorSchemeMode.Light
  );
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

  return (
    <GuiProvider theme={theme} colorScheme={colorScheme}>
      <ConfirmationDialogContextProvider>
        <AppInitializer>{children}</AppInitializer>
      </ConfirmationDialogContextProvider>
    </GuiProvider>
  );
}

export default AppLayout;
