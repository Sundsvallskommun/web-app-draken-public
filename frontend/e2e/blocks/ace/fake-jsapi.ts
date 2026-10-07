/**
 * Stand-in for Telia's JSApi.js bundle, served by Playwright in place of
 * <ACE origin>/enClient/JSApi/external/JSApi.js. It exposes the same window.ACE.JSApi event API as
 * the real bundle (see the JSApi interface specification, chapter 3.6) plus window.__fakeAce, which
 * the tests use to emit events as ACE Interact would.
 *
 * The function runs in the browser: it must stay self-contained (no imports, no outer variables).
 */
function installFakeAceJsApi() {
  const listeners: Record<string, Set<(payload?: unknown) => void>> = {};
  const on = (event: string) => (callback: (payload?: unknown) => void) => {
    (listeners[event] ??= new Set()).add(callback);
    return () => listeners[event].delete(callback);
  };
  const w = window as any;
  w.ACE = {
    JSApi: {
      onConnected: on('connected'),
      onDisconnected: on('disconnected'),
      onLoggedIn: on('loggedIn'),
      onLoggedOut: on('loggedOut'),
      onServerConnectionDown: on('serverConnectionDown'),
      onPopupDisconnected: on('popupDisconnected'),
      onOperationFailed: on('operationFailed'),
      onScreenPop: on('screenPop'),
    },
  };
  w.__fakeAce = {
    emit: (event: string, payload?: unknown) => listeners[event]?.forEach((callback) => callback(payload)),
    listenerCount: (event: string) => listeners[event]?.size ?? 0,
  };
}

/** The bundle URL Draken builds from NEXT_PUBLIC_ACE_ORIGIN, whatever the origin is. */
export const ACE_JSAPI_SCRIPT_PATTERN = '**/enClient/JSApi/external/JSApi.js*';

export const FAKE_JSAPI_SCRIPT = `(${installFakeAceJsApi.toString()})();`;

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
