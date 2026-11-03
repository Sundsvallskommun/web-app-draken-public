import { afterEach, describe, expect, test } from 'vitest';

import { createPendingCallers, removeStoredCallers, requestPendingCaller } from './ace-pending-caller';

// Test person number from Skatteverket, not a real person.
const caller = { personNumber: '199001012385', phoneNumber: '+46701740635' };
// Short enough to keep the tests fast; the receiving tab answers at once.
const timeoutMs = 200;

let pendingCallers: ReturnType<typeof createPendingCallers>;

afterEach(() => {
  pendingCallers?.close();
});

describe('pending ACE caller hand-over', () => {
  test('hands the caller over to the errand it was added for, once', async () => {
    pendingCallers = createPendingCallers();
    pendingCallers.add('KC-1', caller);

    expect(await requestPendingCaller('KC-2', timeoutMs)).toBeNull();
    expect(await requestPendingCaller('KC-1', timeoutMs)).toEqual(caller);
    expect(await requestPendingCaller('KC-1', timeoutMs)).toBeNull();
  });

  test('hands over the phone number of a caller who was not identified', async () => {
    pendingCallers = createPendingCallers();
    pendingCallers.add('KC-1', { phoneNumber: caller.phoneNumber });

    expect(await requestPendingCaller('KC-1', timeoutMs)).toEqual({ phoneNumber: caller.phoneNumber });
  });

  test('does not hand over a caller that has expired', async () => {
    pendingCallers = createPendingCallers(10);
    pendingCallers.add('KC-1', caller);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(await requestPendingCaller('KC-1', timeoutMs)).toBeNull();
  });

  test('drops the caller of an errand that will not be opened', async () => {
    pendingCallers = createPendingCallers();
    pendingCallers.add('KC-1', caller);
    pendingCallers.add('KC-2', caller);

    pendingCallers.remove('KC-1');

    expect(await requestPendingCaller('KC-1', timeoutMs)).toBeNull();
    expect(await requestPendingCaller('KC-2', timeoutMs)).toEqual(caller);
  });

  test('hands nothing over once the receiving tab has closed', async () => {
    pendingCallers = createPendingCallers();
    pendingCallers.add('KC-1', caller);
    pendingCallers.close();

    expect(await requestPendingCaller('KC-1', timeoutMs)).toBeNull();
  });

  test('asks for nothing without an errand number', async () => {
    expect(await requestPendingCaller('', timeoutMs)).toBeNull();
  });
});

describe('removeStoredCallers', () => {
  const memoryStorage = (entries: Record<string, string>) => {
    const items = new Map(Object.entries(entries));
    return {
      get length() {
        return items.size;
      },
      key: (index: number) => [...items.keys()][index] ?? null,
      removeItem: (key: string) => void items.delete(key),
      items,
    };
  };

  test('removes the callers earlier versions left in localStorage, and nothing else', () => {
    const storage = memoryStorage({
      'draken-ace-caller:KC-1': JSON.stringify(caller),
      'draken-ace-caller:KC-2': JSON.stringify(caller),
      'draken-ace-contact:42': '1',
      unrelated: 'value',
    });

    removeStoredCallers(storage);

    expect([...storage.items.keys()]).toEqual(['draken-ace-contact:42', 'unrelated']);
  });

  test('does nothing without storage', () => {
    expect(() => removeStoredCallers(null)).not.toThrow();
  });
});
