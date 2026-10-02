'use client';

import { appConfig } from '@config/appconfig';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useUserStore } from '@stores/index';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { AceConfig, getAceConfig } from './ace-config';
import { AceJSApi } from './ace-jsapi.types';
import { installAceMock } from './ace-mock';
import { removeExpiredPendingCallers, storePendingCaller } from './ace-pending-caller';
import { AceCaller, parseScreenPop } from './ace-screen-pop';
import { AceStatus, useAceStore } from './ace-store';

const LOCK_NAME = 'draken-ace-jsapi';
const CHANNEL_NAME = 'draken-ace-status';

type ChannelMessage = { type: 'status'; status: AceStatus } | { type: 'status-request' };

let jsApiPromise: Promise<AceJSApi> | null = null;

/** Loads the JS API once per tab. The external bundle opens ACE's connector popup when it loads. */
const loadJsApi = (config: AceConfig): Promise<AceJSApi> => {
  if (!jsApiPromise) {
    jsApiPromise = new Promise<AceJSApi>((resolve, reject) => {
      if (window.ACE?.JSApi) {
        resolve(window.ACE.JSApi);
        return;
      }
      if (config.mode !== 'script') {
        reject(new Error('ACE JS API mock is not available'));
        return;
      }
      const script = document.createElement('script');
      script.src = config.scriptUrl;
      script.crossOrigin = 'anonymous';
      script.async = true;
      script.onload = () =>
        window.ACE?.JSApi ? resolve(window.ACE.JSApi) : reject(new Error('ACE JS API missing after load'));
      script.onerror = () => reject(new Error('ACE JS API could not be loaded'));
      document.head.appendChild(script);
    }).catch((e) => {
      // Allow a later mount (e.g. after a reload of the leading tab) to try again.
      jsApiPromise = null;
      throw e;
    });
  }
  return jsApiPromise;
};

/**
 * Runs the ACE Agent Interface integration for Kontakt Sundsvall: when an identified caller is
 * accepted in ACE Interact, a new errand is created and opened in a new tab with the caller
 * pre-filled as customer (see useAceCallerPrefill).
 *
 * Only one Draken tab at a time loads the JS API (Web Locks); the other tabs mirror its status.
 * Draken works as usual whenever ACE is not configured, cannot be loaded or is disconnected.
 */
export const AceConnector: React.FC = () => {
  const config = useRef(getAceConfig()).current;
  const username = useUserStore((s) => s.user.username);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const setStatus = useAceStore((s) => s.setStatus);
  const router = useRouter();
  const toastMessage = useSnackbar();

  // Event handlers registered with ACE read the latest values through this ref.
  const latest = useRef({ municipalityId, router, toastMessage });
  useEffect(() => {
    latest.current = { municipalityId, router, toastMessage };
  });

  const enabled = !!config && appConfig.isSupportManagement && !!username;

  useEffect(() => {
    if (!enabled || !config) {
      setStatus('disabled');
      return;
    }

    removeExpiredPendingCallers();
    setStatus('connecting');
    if (config.mode === 'mock' && process.env.NODE_ENV === 'development') {
      // Every tab gets drakenAceMock in its console; the mock forwards events to the leading tab.
      installAceMock();
    }

    let isLeader = false;
    let disposed = false;
    const removeListeners: (() => void)[] = [];
    const handledContactIds = new Set<string>();
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

    const updateStatus = (status: AceStatus) => {
      setStatus(status);
      channel?.postMessage({ type: 'status', status } satisfies ChannelMessage);
    };

    if (channel) {
      channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        if (isLeader && event.data?.type === 'status-request') {
          channel.postMessage({ type: 'status', status: useAceStore.getState().status } satisfies ChannelMessage);
        } else if (!isLeader && event.data?.type === 'status') {
          setStatus(event.data.status);
        }
      };
      channel.postMessage({ type: 'status-request' } satisfies ChannelMessage);
    }

    const openErrandForCaller = async (caller: AceCaller) => {
      const { municipalityId, router, toastMessage } = latest.current;
      try {
        // Loaded on demand: importing the errand services statically from the app root changes the
        // module evaluation order and trips the existing file-upload <-> casedata-attachment-service cycle.
        const { initiateSupportErrand } = await import('@supportmanagement/services/support-errand-service');
        const errand = await initiateSupportErrand(municipalityId);
        const errandNumber: string | undefined = errand?.errandNumber;
        if (!errandNumber) {
          throw new Error('No errand number for new errand');
        }
        storePendingCaller(errandNumber, caller.personNumber);
        const newTab = window.open(`${process.env.NEXT_PUBLIC_BASEPATH}/arende/${errandNumber}`, '_blank');
        if (newTab) {
          newTab.opener = null;
          return;
        }
        // Popups blocked: open the errand in this tab instead. WarnIfUnsavedChanges patches
        // router.push to reject when the case worker chooses to stay on a page with unsaved changes.
        try {
          await router.push(`/arende/${errandNumber}`);
        } catch {
          toastMessage({
            position: 'bottom',
            closeable: true,
            message: `Ärende ${errandNumber} har skapats för det inkommande samtalet men öppnades inte. Öppna det från översikten.`,
            status: 'info',
          });
        }
      } catch {
        toastMessage({
          position: 'bottom',
          closeable: true,
          message: 'Något gick fel när ett ärende skulle skapas för det inkommande samtalet',
          status: 'error',
        });
      }
    };

    const startAsLeader = async () => {
      isLeader = true;
      updateStatus('connecting');
      let jsApi: AceJSApi;
      try {
        jsApi = await loadJsApi(config);
      } catch {
        if (!disposed) {
          updateStatus('unavailable');
        }
        return;
      }
      if (disposed) {
        return;
      }
      const connected = () => updateStatus('connected');
      const disconnected = () => updateStatus('disconnected');
      removeListeners.push(
        jsApi.onConnected(connected),
        jsApi.onLoggedIn(connected),
        jsApi.onDisconnected(disconnected),
        jsApi.onLoggedOut(disconnected),
        jsApi.onServerConnectionDown(disconnected),
        jsApi.onScreenPop((message) => {
          const caller = parseScreenPop(message);
          // ACE may repeat the pop for the same contact; handle each contact once.
          if (!caller || handledContactIds.has(caller.contactId)) {
            if (process.env.NODE_ENV === 'development') {
              console.info(`[ACE] Screen pop ignorerad (${message?.popEvent ?? 'okänd händelse'}).`);
            }
            return;
          }
          if (process.env.NODE_ENV === 'development') {
            console.info('[ACE] Inkommande samtal, skapar ärende.');
          }
          handledContactIds.add(caller.contactId);
          openErrandForCaller(caller);
        })
      );
      if (jsApi.onPopupDisconnected) {
        removeListeners.push(jsApi.onPopupDisconnected(disconnected));
      }
    };

    // Hold the lock for as long as this tab is mounted; the next tab takes over when it is released.
    // Without Web Locks no tab can be sure it is the only one handling calls, and several leaders
    // would each create an errand per call, so ACE stays off rather than risk duplicates.
    let releaseLock: () => void = () => {};
    // Local only: another tab may hold the lock and work fine.
    const unavailable = () => {
      if (!disposed) {
        setStatus('unavailable');
      }
    };
    if (typeof navigator !== 'undefined' && navigator.locks) {
      navigator.locks
        .request(LOCK_NAME, () => {
          if (disposed) {
            return;
          }
          startAsLeader();
          return new Promise<void>((resolve) => {
            releaseLock = resolve;
          });
        })
        .catch(unavailable);
    } else {
      unavailable();
    }

    return () => {
      disposed = true;
      removeListeners.forEach((remove) => remove());
      releaseLock();
      channel?.close();
    };
    // config is fixed for the lifetime of the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, setStatus]);

  return null;
};
