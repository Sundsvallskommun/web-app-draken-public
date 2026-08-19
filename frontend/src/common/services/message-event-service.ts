import { MessageContactMeans } from '@common/services/message-template-body-service';

// Meddelandepanelen ligger utanför komponentträdet för de vyer som vill öppna den (sidofältet,
// intressentkorten, kopplade ärenden), så den öppnas via ett fönsterevent. Kontraktet ligger
// samlat här i stället för att varje avsändare bygger sitt eget CustomEvent — detail är annars
// otypat och avsändare och mottagare kan glida isär utan att kompilatorn säger något.
const OPEN_MESSAGE_EVENT = 'openMessage';

export interface OpenMessageDetail {
  /** Förvald kontaktväg i meddelandeformuläret. */
  contactMeans?: MessageContactMeans;
  /** caseId för det relaterade ärende meddelandet ska gå till (används med contactMeans 'draken'). */
  relationCaseId?: string;
}

export const dispatchOpenMessage = (detail: OpenMessageDetail = {}) => {
  window.dispatchEvent(new CustomEvent<OpenMessageDetail>(OPEN_MESSAGE_EVENT, { detail }));
};

export const subscribeToOpenMessage = (handler: (detail: OpenMessageDetail) => void) => {
  const listener = (event: Event) => handler((event as CustomEvent<OpenMessageDetail>).detail ?? {});
  window.addEventListener(OPEN_MESSAGE_EVENT, listener);
  return () => window.removeEventListener(OPEN_MESSAGE_EVENT, listener);
};
