'use client';

import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
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
import { getInvestigationProfile } from '@supportmanagement/investigation/investigation-profile-service';
import { useInvestigationProfileStore } from '@supportmanagement/investigation/investigation-profile-store';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import { ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

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

function isInvestigationSchemaLabRoute(): boolean {
  return globalThis.window?.location.pathname.endsWith('/schema-lab/utredning') ?? false;
}

function isAuthenticationRoute(): boolean {
  return /\/(?:login|logout)\/?$/u.test(globalThis.window?.location.pathname ?? '');
}

function AppInitializer({ children }: Readonly<{ children: ReactNode }>) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const schemaLabRoute = isInvestigationSchemaLabRoute();
  const authenticationRoute = isAuthenticationRoute();
  const [featureFlagsReady, setFeatureFlagsReady] = useState(schemaLabRoute);
  const investigationProfileStatus = useInvestigationProfileStore((state) => state.status);

  useEffect(() => {
    if (schemaLabRoute) return;

    const municipalityId = process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '';
    useConfigStore.getState().setMunicipalityId(municipalityId);
    useInvestigationProfileStore.getState().reset();

    getMe()
      .then((user) => {
        useUserStore.getState().setUser(user);
      })
      .catch(() => {});

    const loadRuntimeConfiguration = async () => {
      try {
        const response = await getFeatureFlags();
        applyRuntimeFeatureFlags(response.data);
      } catch {
        // Environment flags remain the fallback when Adminpanel is unavailable.
      }

      if (authenticationRoute || !appConfig.isSupportManagement) {
        useInvestigationProfileStore.getState().setDisabled();
        setFeatureFlagsReady(true);
        return;
      }

      useInvestigationProfileStore.getState().startLoading();
      try {
        const profile = await getInvestigationProfile(process.env.NEXT_PUBLIC_APPLICATION);
        useInvestigationProfileStore.getState().setProfile(profile);
      } catch (error) {
        console.error('Failed to load the SupportManagement investigation profile.', error);
        useInvestigationProfileStore.getState().setError();
      } finally {
        setFeatureFlagsReady(true);
      }
    };
    void loadRuntimeConfiguration();

    getAdminUsers()
      .then((data) => {
        useUserStore.getState().setAdministrators(data);
      })
      .catch(() => {});
  }, [authenticationRoute, schemaLabRoute]);

  useEffect(() => {
    if (schemaLabRoute || !featureFlagsReady) return;

    if (appConfig.isSupportManagement && process.env.NEXT_PUBLIC_MUNICIPALITY_ID) {
      getSupportMetadata(process.env.NEXT_PUBLIC_MUNICIPALITY_ID).then((res) => {
        useMetadataStore.getState().setSupportMetadata(res.metadata);
      });
    }
  }, [featureFlagsReady, schemaLabRoute]);

  const investigationProfileReady =
    schemaLabRoute ||
    investigationProfileStatus === 'ready' ||
    investigationProfileStatus === 'error' ||
    investigationProfileStatus === 'disabled';
  if (!mounted || !featureFlagsReady) {
    return null;
  }

  if (!investigationProfileReady) {
    return <LoaderFullScreen />;
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
