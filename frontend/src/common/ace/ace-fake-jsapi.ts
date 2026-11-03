import type { AceJSApi } from './ace-jsapi.types';

/** Events the fake can emit, named after the JSApi on<Event> registrations. */
export type FakeAceEvent =
  | 'connected'
  | 'disconnected'
  | 'loggedIn'
  | 'loggedOut'
  | 'serverConnectionDown'
  | 'popupDisconnected'
  | 'operationFailed'
  | 'screenPop';

export interface FakeAceJsApi {
  jsApi: AceJSApi;
  emit: (event: FakeAceEvent, payload?: unknown) => void;
  listenerCount: (event: FakeAceEvent) => number;
}

/**
 * The one fake of Telia's JS API, shared by the development mock (ace-mock.ts) and the Playwright
 * suite (e2e/blocks/ace). Like the real bundle it only reports events as they happen; nothing is
 * replayed to listeners that register later.
 *
 * Must stay self-contained (no imports at runtime, no outer variables): the e2e suite serializes it
 * with toString() and serves it as the bundle.
 */
export function createFakeAceJsApi(): FakeAceJsApi {
  const listeners: Record<string, Set<(payload?: unknown) => void>> = {};
  const on = (event: FakeAceEvent) => (callback: (payload?: any) => void) => {
    const set = listeners[event] ?? new Set();
    listeners[event] = set;
    set.add(callback);
    return () => {
      set.delete(callback);
    };
  };
  return {
    jsApi: {
      onConnected: on('connected'),
      onDisconnected: on('disconnected'),
      onLoggedIn: on('loggedIn'),
      onLoggedOut: on('loggedOut'),
      onServerConnectionDown: on('serverConnectionDown'),
      onPopupDisconnected: on('popupDisconnected'),
      onOperationFailed: on('operationFailed'),
      onScreenPop: on('screenPop'),
    },
    emit: (event, payload) => listeners[event]?.forEach((callback) => callback(payload)),
    listenerCount: (event) => listeners[event]?.size ?? 0,
  };
}
