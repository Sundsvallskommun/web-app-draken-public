import { createFakeAceJsApi, FakeAceEvent } from './ace-fake-jsapi';
import { AceScreenPopMessage } from './ace-jsapi.types';

// Test person number from Skatteverket, not a real person (same as backend/src/tests/helpers/mock-data.ts).
const MOCK_PERSON_NUMBER = '199001012385';
// In the range PTS reserves for fiction, like the number in Telia's example.
const MOCK_PHONE_NUMBER = '+46701740635';
const CHANNEL_NAME = 'draken-ace-mock';

interface AceMockControls {
  screenPop: (personNumber?: string, phoneNumber?: string) => void;
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
 *   drakenAceMock.screenPop('')           // caller who did not identify, known by phone number
 *   drakenAceMock.disconnect() / drakenAceMock.connect()
 * Events are shared between tabs, like a single ACE Interact session, so the tab that runs the
 * integration receives them wherever they are triggered.
 */
export const installAceMock = (): void => {
  if (window.ACE?.JSApi) {
    return;
  }
  const fake = createFakeAceJsApi();
  window.ACE = { JSApi: fake.jsApi };

  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
  if (channel) {
    channel.onmessage = (e: MessageEvent<{ event: FakeAceEvent; payload?: unknown }>) =>
      fake.emit(e.data.event, e.data.payload);
  }
  const dispatch = (event: FakeAceEvent, payload?: unknown) => {
    fake.emit(event, payload);
    channel?.postMessage({ event, payload });
  };

  window.drakenAceMock = {
    // Shaped after Telia's afterNormalAccept example, with the identity replaced by a test person.
    screenPop: (personNumber = MOCK_PERSON_NUMBER, phoneNumber = MOCK_PHONE_NUMBER) => {
      if (personNumber && !/^\d{12}$/.test(personNumber)) {
        console.warn('[ACE-mock] ACE skickar personnumret som 12 siffror utan bindestreck (YYYYMMDDNNNN).');
      }
      console.info(
        fake.listenerCount('screenPop') > 0
          ? '[ACE-mock] Samtal skickat, hanteras i den här fliken.'
          : '[ACE-mock] Samtal skickat till fliken som har ACE-anslutningen. Om inget händer: ladda om alla Draken-flikar.'
      );
      const message: AceScreenPopMessage = {
        popEvent: 'afterNormalAccept',
        contact: {
          contactId: Date.now(),
          contactStatus: 'active',
          currentContactsType: 'ivr',
          contactData: {
            Ani: phoneNumber,
            contactSourceType: 'ivr',
            direction: 'incoming',
            media: 'call',
            ...(personNumber && { eidUserPnr: personNumber }),
          },
        },
      };
      dispatch('screenPop', message);
    },
    connect: () => dispatch('connected'),
    disconnect: () => dispatch('disconnected'),
  };

  setTimeout(() => window.drakenAceMock?.connect(), 0);
};
