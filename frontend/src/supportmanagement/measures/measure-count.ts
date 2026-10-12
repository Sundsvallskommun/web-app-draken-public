import { useEffect } from 'react';
import { create } from 'zustand';

import { getSupportMeasures } from './support-measure-service';

interface MeasureCountState {
  readonly counts: Readonly<Record<string, number>>;
  readonly setCount: (errandId: string, count: number) => void;
}

/**
 * How many measures each errand had when its measures were last read. The Åtgärder tab keeps it current on every
 * load, so anything outside the tab that only needs to know whether there are any does not read the list again.
 */
export const useMeasureCountStore = create<MeasureCountState>((set) => ({
  counts: {},
  setCount: (errandId, count) => set((state) => ({ counts: { ...state.counts, [errandId]: count } })),
}));

/**
 * The errand's number of measures, or undefined while it is not known. Asks once when nothing has read the
 * measures yet; a failed read leaves it unknown, and whoever asks then says nothing about measures.
 */
export function useErrandMeasureCount(
  municipalityId: string | undefined,
  errandId: string | undefined,
  enabled: boolean
): number | undefined {
  const count = useMeasureCountStore((state) => (errandId ? state.counts[errandId] : undefined));

  useEffect(() => {
    if (!enabled || !municipalityId || !errandId || count !== undefined) return;
    let cancelled = false;
    getSupportMeasures(municipalityId, errandId)
      .then((snapshot) => {
        if (!cancelled) useMeasureCountStore.getState().setCount(errandId, snapshot.measures.length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled, municipalityId, errandId, count]);

  return enabled ? count : undefined;
}
