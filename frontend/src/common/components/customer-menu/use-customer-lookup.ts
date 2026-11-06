'use client';

import { useEffect, useState } from 'react';

export type CustomerLookup<T> = { status: 'loading' } | { status: 'error' } | { status: 'done'; data: T };

const LOADING = { status: 'loading' } as const;

/** Runs `load` once per `key`; a result for an earlier key is never returned. Waits while `load` is undefined. */
export const useCustomerLookup = <T>(key: string, load: (() => Promise<T>) | undefined): CustomerLookup<T> => {
  const [result, setResult] = useState<{ key: string; lookup: CustomerLookup<T> }>();
  const ready = !!load;

  useEffect(() => {
    if (!load) {
      return;
    }
    let cancelled = false;
    load()
      .then((data) => !cancelled && setResult({ key, lookup: { status: 'done', data } }))
      .catch(() => !cancelled && setResult({ key, lookup: { status: 'error' } }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return result?.key === key ? result.lookup : LOADING;
};
