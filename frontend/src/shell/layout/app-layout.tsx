'use client';

import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
import { getFeatureFlags } from '@common/services/feature-flag-service';
import { getAdminUsers, getMe } from '@common/services/user-service';
import { appConfig, applyRuntimeFeatureFlags } from '@config/appconfig';
import { APP_IDENTITY } from '@shell/app-identity';
import { validateDragonConfiguration } from '@shell/compose-dragon';
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
  // The lab route is not compiled into production builds (see pageExtensions in next.config.js),
  // so this branch folds away there instead of running its path check on every app bootstrap.
  if (process.env.NODE_ENV === 'production') return false;
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
  const [configurationError, setConfigurationError] = useState<Error | null>(null);
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

      // bootstrap.ts validated the environment flags at startup. The runtime flags applied above
      // can change the investigation-variant flags, so the same check runs again here.
      try {
        validateDragonConfiguration(appConfig.features);
      } catch (error) {
        setConfigurationError(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      if (authenticationRoute || !appConfig.isSupportManagement) {
        useInvestigationProfileStore.getState().setDisabled();
        setFeatureFlagsReady(true);
        return;
      }

      // The runtime flags decide whether this is a SupportManagement app, so metadata waits for
      // them - but not for the profile behind them. Chaining the two would put a second request
      // timeout in front of the first paint and delay metadata by that long again.
      useInvestigationProfileStore.getState().startLoading();
      setFeatureFlagsReady(true);
      try {
        const profile = await getInvestigationProfile(APP_IDENTITY);
        useInvestigationProfileStore.getState().setProfile(profile);
      } catch (error) {
        console.error('Failed to load the SupportManagement investigation profile.', error);
        useInvestigationProfileStore.getState().setError();
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
  // Thrown from render on purpose. The validation runs inside an async effect, where a throw is
  // only an unhandled promise rejection that React never sees; thrown here it reaches the nearest
  // error boundary above this component. AppLayout renders in the root layout, above the
  // `[locale]` segment, so that boundary is `src/app/global-error.tsx` - `[locale]/error.tsx`
  // only covers the pages below the locale layout.
  if (configurationError) throw configurationError;

  if (!mounted) {
    return null;
  }

  // A slow Adminpanel or profile endpoint should show that the app is working, not a blank page.
  if (!featureFlagsReady || !investigationProfileReady) {
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
