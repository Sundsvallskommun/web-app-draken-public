import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';

const STALE_TIME_MS = 30 * 60 * 1000;

interface MetadataState {
  supportMetadata: SupportMetadata | undefined;
  lastFetched: number | null;
}

interface MetadataActions {
  setSupportMetadata: (metadata: SupportMetadata) => void;
  isStale: () => boolean;
  clear: () => void;
}

type MetadataStore = MetadataState & MetadataActions;

export const useMetadataStore = create(
  persist<MetadataStore>(
    (set, get) => ({
      supportMetadata: undefined,
      lastFetched: null,
      setSupportMetadata: (metadata) =>
        set({ supportMetadata: metadata, lastFetched: Date.now() }),
      isStale: () => {
        const { lastFetched } = get();
        if (!lastFetched) return true;
        return Date.now() - lastFetched > STALE_TIME_MS;
      },
      clear: () => set({ supportMetadata: undefined, lastFetched: null }),
    }),
    {
      name: `${process.env.NEXT_PUBLIC_APPLICATION || 'app'}-metadata-store`,
    }
  )
);
