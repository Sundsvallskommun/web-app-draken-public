import { createFakeAceJsApi } from '../../../src/common/ace/ace-fake-jsapi';

export type { FakeAceEvent } from '../../../src/common/ace/ace-fake-jsapi';

/** The bundle URL Draken builds from NEXT_PUBLIC_ACE_ORIGIN, whatever the origin is. */
export const ACE_JSAPI_SCRIPT_PATTERN = '**/enClient/JSApi/external/JSApi.js*';

/**
 * Stand-in for Telia's JSApi.js bundle, served by Playwright in place of
 * <ACE origin>/enClient/JSApi/external/JSApi.js. It is the same fake the development mock uses
 * (src/common/ace/ace-fake-jsapi.ts), exposed as window.ACE.JSApi like the real bundle, plus
 * window.__fakeAce, which the tests use to emit events as ACE Interact would.
 */
export const FAKE_JSAPI_SCRIPT = `(() => {
  const createFakeAceJsApi = ${createFakeAceJsApi.toString()};
  const fake = createFakeAceJsApi();
  window.ACE = { JSApi: fake.jsApi };
  window.__fakeAce = fake;
})();`;
