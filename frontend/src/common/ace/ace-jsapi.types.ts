/**
 * Types for the subset of Telia ACE Agent Interface (JS API) that Draken uses.
 * See "Telia ACE - Interface Specification Agent Interface - JSApi", chapter 3.6-3.7.
 * Telia ships no typings for the bundle, so these are written from the specification.
 */

type AceContactData = Record<string, string | number | boolean | undefined>;

interface AceContact {
  contactId: string | number;
  contactStatus?: string;
  currentContactsType?: string;
  isActiveContact?: boolean;
  contactData?: AceContactData;
}

export interface AceScreenPopMessage {
  contact?: AceContact;
  popEvent?: string;
}

interface AceOperationFailedMessage {
  function?: string;
  reason?: string;
  severity?: string;
  errorId?: number;
}

/** Every event registration returns a function that removes the listener. */
type RemoveListener = () => void;

export interface AceJSApi {
  onConnected: (callback: () => void) => RemoveListener;
  onDisconnected: (callback: () => void) => RemoveListener;
  onLoggedIn: (callback: () => void) => RemoveListener;
  onLoggedOut: (callback: (reason: string) => void) => RemoveListener;
  onServerConnectionDown: (callback: () => void) => RemoveListener;
  onPopupDisconnected?: (callback: () => void) => RemoveListener;
  onOperationFailed: (callback: (message: AceOperationFailedMessage) => void) => RemoveListener;
  onScreenPop: (callback: (message: AceScreenPopMessage) => void) => RemoveListener;
}

declare global {
  interface Window {
    ACE?: { JSApi?: AceJSApi };
  }
}
