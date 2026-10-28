'use client';

import { appURL } from '@common/utils/app-url';
import { appConfig } from '@config/appconfig';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useUserStore } from '@stores/index';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { AceConfig, getAceConfig } from './ace-config';
import { markContactHandled } from './ace-handled-contacts';
import { AceJSApi } from './ace-jsapi.types';
import { installAceMock } from './ace-mock';
import {
  PENDING_CALLER_TTL_MS,
  removeExpiredPendingCallers,
  removePendingCaller,
  storePendingCaller,
} from './ace-pending-caller';
import { AceCaller, loggableScreenPop, parseScreenPop } from './ace-screen-pop';
import { AceStatus, useAceStore } from './ace-store';

const LOCK_NAME = 'draken-ace-jsapi';
const CHANNEL_NAME = 'draken-ace-status';

type ChannelMessage =
  | { type: 'status'; status: AceStatus }
  | { type: 'status-request' }
  | { type: 'errand-opened-in-leader'; errandNumber: string };

let jsApiPromise: Promise<AceJSApi> | null = null;

/**
 * Logs an event from ACE in every environment, so the integration can be followed in the browser
 * console. The payload is built inside the guard: logging must never stop an event from being handled.
 */
const logAceEvent = (text: string, payload?: () => unknown) => {
  try {
    if (payload) {
      console.info(`[ACE] ${text}`, payload());
    } else {
      console.info(`[ACE] ${text}`);
    }
  } catch {
    // Ignore: the event is handled anyway.
  }
};

const screenPopOutcome = (caller: AceCaller | null, isNewContact: boolean): string => {
  if (!caller) {
    return 'ignorerad';
  }
  if (!isNewContact) {
    return 'ignorerad, kontakten har redan ett ärende';
  }
  if (caller.personNumber) {
    return 'skapar ärende för legitimerad uppringare';
  }
  return caller.phoneNumber ? 'skapar ärende med telefonnumret' : 'skapar tomt ärende, dolt nummer';
};

/**
 * Connection state of the loaded JS API, tracked for the life of the tab. The real bundle reports
 * a connection once, so a component that mounts again later (and registers new listeners) would
 * otherwise wait for an onConnected that never comes.
 */
let jsApiConnection: AceStatus = 'connecting';

const trackConnection = (jsApi: AceJSApi): AceJSApi => {
  const connected = () => {
    jsApiConnection = 'connected';
  };
  const disconnected = () => {
    jsApiConnection = 'disconnected';
  };
  jsApi.onConnected(connected);
  jsApi.onLoggedIn(connected);
  jsApi.onDisconnected(disconnected);
  jsApi.onLoggedOut(disconnected);
  jsApi.onServerConnectionDown(disconnected);
  jsApi.onPopupDisconnected?.(disconnected);
  return jsApi;
};

const popupsBlockedMessage = (errandNumber: string) =>
  `Ärende ${errandNumber} har skapats för det inkommande samtalet och öppnats i en annan Draken-flik. ` +
  'Tillåt popup-fönster för Draken så öppnas ärenden i en ny flik.';

/** Loads the JS API once per tab. The external bundle opens ACE's connector popup when it loads. */
const loadJsApi = (config: AceConfig): Promise<AceJSApi> => {
  jsApiPromise ??= new Promise<AceJSApi>((resolve, reject) => {
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
    // Required by Telia for external use of the bundle (JSApi interface specification, chapter 4).
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () =>
      window.ACE?.JSApi ? resolve(window.ACE.JSApi) : reject(new Error('ACE JS API missing after load'));
    script.onerror = () => reject(new Error('ACE JS API could not be loaded'));
    document.head.appendChild(script);
  })
    .then(trackConnection)
    .catch((e) => {
      // Allow a later mount (e.g. after a reload of the leading tab) to try again.
      jsApiPromise = null;
      throw e;
    });
  return jsApiPromise;
};

/**
 * Runs the ACE Agent Interface integration in an instance that configures ACE (only Kontakt
 * Sundsvall sets NEXT_PUBLIC_ACE_ORIGIN/COMPANY): when a call is accepted in ACE Interact, a new
 * errand is created and opened in a new tab with the caller pre-filled as customer - by personal
 * number when identified in the IVR, otherwise by phone number, or left empty when the number is
 * hidden (see useAceCallerPrefill).
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
    // In-memory fallback for when storage is unavailable; markContactHandled covers reloads and other tabs.
    const handledContactIds = new Set<string>();
    const pendingCallerCleanups: ReturnType<typeof setTimeout>[] = [];
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
        } else if (!isLeader && event.data?.type === 'errand-opened-in-leader') {
          latest.current.toastMessage({
            position: 'bottom',
            closeable: true,
            message: popupsBlockedMessage(event.data.errandNumber),
            status: 'info',
          });
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
        if (caller.personNumber || caller.phoneNumber) {
          storePendingCaller(errandNumber, { personNumber: caller.personNumber, phoneNumber: caller.phoneNumber });
          // Hand-overs nobody picks up (the new tab was closed at once) are removed when they expire.
          pendingCallerCleanups.push(setTimeout(() => removeExpiredPendingCallers(), PENDING_CALLER_TTL_MS + 1000));
        }
        // ACE's own JS API popup already requires popups to be allowed for Draken, so this normally
        // opens a new tab even though it does not follow a click.
        const newTab = window.open(appURL(`/arende/${errandNumber}`), '_blank');
        if (newTab) {
          newTab.opener = null;
          return;
        }
        // Popups blocked: open the errand in this tab instead and tell the other tabs, since this
        // tab (the one holding the lock) need not be the one the case worker is looking at.
        channel?.postMessage({ type: 'errand-opened-in-leader', errandNumber } satisfies ChannelMessage);
        // WarnIfUnsavedChanges patches router.push to reject when the case worker chooses to stay
        // on a page with unsaved changes.
        try {
          await router.push(`/arende/${errandNumber}`);
        } catch {
          removePendingCaller(errandNumber);
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
      // The JS API may have connected before this mount, e.g. when the effect runs again.
      updateStatus(jsApiConnection);
      const connected = (event: string) => () => {
        logAceEvent(event);
        updateStatus('connected');
      };
      const disconnected = (event: string) => () => {
        logAceEvent(event);
        updateStatus('disconnected');
      };
      removeListeners.push(
        jsApi.onConnected(connected('onConnected')),
        jsApi.onLoggedIn(connected('onLoggedIn')),
        jsApi.onDisconnected(disconnected('onDisconnected')),
        jsApi.onLoggedOut((reason) => {
          logAceEvent('onLoggedOut', () => ({ reason }));
          updateStatus('disconnected');
        }),
        jsApi.onServerConnectionDown(disconnected('onServerConnectionDown')),
        jsApi.onOperationFailed((failure) =>
          logAceEvent('onOperationFailed', () => ({
            function: failure?.function,
            reason: failure?.reason,
            severity: failure?.severity,
            errorId: failure?.errorId,
          }))
        ),
        jsApi.onScreenPop((message) => {
          const caller = parseScreenPop(message);
          // ACE may repeat the pop for the same contact; handle each contact once.
          const isNewContact =
            !!caller && !handledContactIds.has(caller.contactId) && markContactHandled(caller.contactId);
          logAceEvent(`onScreenPop: ${screenPopOutcome(caller, isNewContact)}`, () => loggableScreenPop(message));
          if (!caller || !isNewContact) {
            return;
          }
          handledContactIds.add(caller.contactId);
          void openErrandForCaller(caller);
        })
      );
      if (jsApi.onPopupDisconnected) {
        removeListeners.push(jsApi.onPopupDisconnected(disconnected('onPopupDisconnected')));
      }
      if (config.mode === 'mock') {
        // The development mock plays ACE Interact logging in, now that this tab listens.
        window.drakenAceMock?.connect();
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
          void startAsLeader();
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
      pendingCallerCleanups.forEach(clearTimeout);
      releaseLock();
      channel?.close();
    };
    // config is fixed for the lifetime of the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, setStatus]);

  return null;
};
