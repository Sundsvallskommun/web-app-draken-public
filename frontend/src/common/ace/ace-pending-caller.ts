import type { AceCaller } from './ace-screen-pop';

/**
 * Hands the caller over from the tab that received the ACE screen pop to the tab that opens the new
 * errand. The caller is never stored: the receiving tab keeps it in memory and passes it on over a
 * BroadcastChannel when the errand tab asks for it, once, within PENDING_CALLER_TTL_MS.
 */

const CHANNEL_NAME = 'draken-ace-caller';
const PENDING_CALLER_TTL_MS = 2 * 60 * 1000;
/** How long an errand tab waits for an answer. The receiving tab is open, so it answers at once. */
const REQUEST_TIMEOUT_MS = 5000;

/** What the new errand's tab gets to know about the caller. */
export type HandedOverCaller = Pick<AceCaller, 'personNumber' | 'phoneNumber'>;

type HandOverMessage =
  | { type: 'caller-request'; errandNumber: string }
  | { type: 'caller'; errandNumber: string; caller: HandedOverCaller };

const openChannel = (): BroadcastChannel | null =>
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);

/** The callers waiting for their errand tab, held by the tab that received the screen pops. */
export const createPendingCallers = (ttlMs = PENDING_CALLER_TTL_MS) => {
  const pending = new Map<string, { caller: HandedOverCaller; expiry: ReturnType<typeof setTimeout> }>();
  const channel = openChannel();

  const remove = (errandNumber: string) => {
    clearTimeout(pending.get(errandNumber)?.expiry);
    pending.delete(errandNumber);
  };

  if (channel) {
    channel.onmessage = (event: MessageEvent<HandOverMessage>) => {
      const errandNumber = event.data?.type === 'caller-request' ? event.data.errandNumber : undefined;
      const entry = errandNumber ? pending.get(errandNumber) : undefined;
      if (errandNumber && entry) {
        remove(errandNumber);
        channel.postMessage({ type: 'caller', errandNumber, caller: entry.caller } satisfies HandOverMessage);
      }
    };
  }

  return {
    add: (errandNumber: string, caller: HandedOverCaller) => {
      remove(errandNumber);
      pending.set(errandNumber, { caller, expiry: setTimeout(() => pending.delete(errandNumber), ttlMs) });
    },
    /** Drops the caller of an errand that will not be opened, e.g. when navigation was cancelled. */
    remove,
    close: () => {
      [...pending.keys()].forEach(remove);
      channel?.close();
    },
  };
};

/** Asks the tab that received the screen pop for the caller of this errand; null when there is none. */
export const requestPendingCaller = (
  errandNumber: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<HandedOverCaller | null> => {
  const channel = errandNumber ? openChannel() : null;
  if (!channel) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const done = (caller: HandedOverCaller | null) => {
      clearTimeout(timeout);
      channel.close();
      resolve(caller);
    };
    const timeout = setTimeout(() => done(null), timeoutMs);
    channel.onmessage = (event: MessageEvent<HandOverMessage>) => {
      if (event.data?.type === 'caller' && event.data.errandNumber === errandNumber) {
        done(event.data.caller);
      }
    };
    channel.postMessage({ type: 'caller-request', errandNumber } satisfies HandOverMessage);
  });
};
