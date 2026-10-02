import { AceJSApi, AceScreenPopMessage } from './ace-jsapi.types';

// Test person number from Skatteverket, not a real person (same as backend/src/tests/helpers/mock-data.ts).
const MOCK_PERSON_NUMBER = '199001012385';
const CHANNEL_NAME = 'draken-ace-mock';

type Listener = (...args: any[]) => void;

interface AceMockControls {
  screenPop: (personNumber?: string) => void;
  connect: () => void;
  disconnect: () => void;
}

declare global {
  interface Window {
    drakenAceMock?: AceMockControls;
  }
}

/**
 * Development-only stand-in for the ACE JS API, since ACE only accepts whitelisted https origins.
 * Enable with NEXT_PUBLIC_ACE_MOCK=true and trigger a call from the browser console of any Draken tab:
 *   drakenAceMock.screenPop()            // Skatteverket test person
 *   drakenAceMock.screenPop('19YYMMDDNNNN')
 *   drakenAceMock.disconnect() / drakenAceMock.connect()
 * Events are shared between tabs, like a single ACE Interact session, so the tab that runs the
 * integration receives them wherever they are triggered.
 */
export const installAceMock = (): void => {
  if (window.ACE?.JSApi) {
    return;
  }
  const listeners = new Map<string, Set<Listener>>();
  const on =
    (event: string) =>
    (callback: Listener): (() => void) => {
      const set = listeners.get(event) ?? new Set<Listener>();
      set.add(callback);
      listeners.set(event, set);
      return () => set.delete(callback);
    };

  let connected = false;
  const emit = (event: string, args: unknown[]) => {
    if (event === 'connected' || event === 'disconnected') {
      connected = event === 'connected';
    }
    listeners.get(event)?.forEach((callback) => callback(...args));
  };

  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  if (channel) {
    channel.onmessage = (e: MessageEvent<{ event: string; args: unknown[] }>) => emit(e.data.event, e.data.args);
  }
  const dispatch = (event: string, ...args: unknown[]) => {
    emit(event, args);
    channel?.postMessage({ event, args });
  };

  const jsApi: AceJSApi = {
    // Like a live ACE Interact session, tell listeners that register later (e.g. after a hot reload) it is up.
    onConnected: (callback) => {
      const remove = on('connected')(callback);
      if (connected) {
        setTimeout(callback, 0);
      }
      return remove;
    },
    onDisconnected: on('disconnected'),
    onLoggedIn: on('loggedIn'),
    onLoggedOut: on('loggedOut'),
    onServerConnectionDown: on('serverConnectionDown'),
    onPopupDisconnected: on('popupDisconnected'),
    onOperationFailed: on('operationFailed'),
    onScreenPop: on('screenPop'),
  };
  window.ACE = { JSApi: jsApi };

  window.drakenAceMock = {
    // Shaped after Telia's afterNormalAccept example, with the identity replaced by a test person.
    screenPop: (personNumber = MOCK_PERSON_NUMBER) => {
      const message: AceScreenPopMessage = {
        popEvent: 'afterNormalAccept',
        contact: {
          contactId: Date.now(),
          contactStatus: 'active',
          currentContactsType: 'ivr',
          contactData: {
            contactSourceType: 'ivr',
            direction: 'incoming',
            media: 'call',
            eidUserPnr: personNumber,
          },
        },
      };
      if (!/^\d{12}$/.test(personNumber)) {
        console.warn('[ACE-mock] ACE skickar personnumret som 12 siffror utan bindestreck (YYYYMMDDNNNN).');
      }
      const handledHere = (listeners.get('screenPop')?.size ?? 0) > 0;
      console.info(
        handledHere
          ? '[ACE-mock] Samtal skickat, hanteras i den här fliken.'
          : '[ACE-mock] Samtal skickat till fliken som har ACE-anslutningen. Om inget händer: ladda om alla Draken-flikar.'
      );
      dispatch('screenPop', message);
    },
    connect: () => dispatch('connected'),
    disconnect: () => dispatch('disconnected'),
  };

  setTimeout(() => window.drakenAceMock?.connect(), 0);
};
