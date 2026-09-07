'use client';
import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
import { getApiDeploymentError, subscribeApiDeploymentError } from '@common/services/api-service';
import { logClientFailure } from '@common/services/client-diagnostics';
import { getFeatureFlags } from '@common/services/feature-flag-service';
import { getAdminUsers, getMe } from '@common/services/user-service';
import { appConfig, applyRuntimeFeatureFlags, FeatureFlagConfigurationError } from '@config/appconfig';
import { APP_IDENTITY, BUILT_DRAGON_ID } from '@shell/app-identity';
import { validateDragonDeployment } from '@shell/compose-dragon';
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
import { getSupportApplicationProfile } from '@supportmanagement/application/support-application-profile-service';
import { useSupportApplicationProfileStore } from '@supportmanagement/application/support-application-profile-store';
import { getInvestigation } from '@supportmanagement/investigation/configured-investigation';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import { ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { FeatureFlagDto } from 'src/data-contracts/backend/data-contracts';

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
  const apiDeploymentError = useSyncExternalStore(
    subscribeApiDeploymentError,
    getApiDeploymentError,
    getApiDeploymentError
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const schemaLabRoute = isInvestigationSchemaLabRoute();
  const authenticationRoute = isAuthenticationRoute();
  const [featureFlagsReady, setFeatureFlagsReady] = useState(schemaLabRoute);
  const [configurationError, setConfigurationError] = useState<Error | null>(null);
  const supportProfileStatus = useSupportApplicationProfileStore((state) => state.status);

  useEffect(() => {
    if (schemaLabRoute) return;

    const municipalityId = process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '';
    useConfigStore.getState().setMunicipalityId(municipalityId);
    useSupportApplicationProfileStore.getState().reset();

    getMe()
      .then((user) => {
        useUserStore.getState().setUser(user);
      })
      .catch(() => {});

    const loadRuntimeConfiguration = async () => {
      let flags: FeatureFlagDto[] | undefined;
      try {
        const response = await getFeatureFlags();
        flags = response.data;
      } catch (error) {
        if (error instanceof FeatureFlagConfigurationError) {
          setConfigurationError(error);
          return;
        }
        // Environment flags remain the fallback when Adminpanel is unavailable.
      }

      // Bootstrap checked the environment. Runtime may change activation, so verify
      // that this application supplies an implementation before rendering.
      try {
        if (flags) applyRuntimeFeatureFlags(flags);
        validateDragonDeployment(APP_IDENTITY, BUILT_DRAGON_ID, appConfig);
        getInvestigation();
      } catch (error) {
        setConfigurationError(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      if (authenticationRoute || !appConfig.isSupportManagement) {
        useSupportApplicationProfileStore.getState().setDisabled();
        setFeatureFlagsReady(true);
        return;
      }

      // Runtime capabilities are ready before metadata, but metadata does not wait for the
      // profile behind them. Chaining the two would put a second request
      // timeout in front of the first paint and delay metadata by that long again.
      useSupportApplicationProfileStore.getState().startLoading();
      setFeatureFlagsReady(true);
      try {
        const profile = await getSupportApplicationProfile(APP_IDENTITY);
        useSupportApplicationProfileStore.getState().setProfile(profile);
      } catch (error) {
        logClientFailure('shell.app-layout.loadRuntimeConfiguration', error);
        useSupportApplicationProfileStore.getState().setError();
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

  const supportProfileReady =
    schemaLabRoute ||
    supportProfileStatus === 'ready' ||
    supportProfileStatus === 'error' ||
    supportProfileStatus === 'disabled';
  // Thrown from render on purpose. The validation runs inside an async effect, where a throw is
  // only an unhandled promise rejection that React never sees; thrown here it reaches the nearest
  // error boundary above this component. AppLayout renders in the root layout, above the
  // `[locale]` segment, so that boundary is `src/app/global-error.tsx` - `[locale]/error.tsx`
  // only covers the pages below the locale layout.
  if (apiDeploymentError) throw apiDeploymentError;
  if (configurationError) throw configurationError;

  if (!mounted) {
    return null;
  }

  // A slow Adminpanel or profile endpoint should show that the app is working, not a blank page.
  if (!featureFlagsReady || !supportProfileReady) {
    return <LoaderFullScreen />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: Readonly<ClientApplicationProps>) {
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
