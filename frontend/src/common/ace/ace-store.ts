import { create } from 'zustand';

/**
 * - disabled:     ACE is not configured for this instance; nothing is shown.
 * - connecting:   the JS API is loading or waiting for ACE Interact.
 * - connected:    ACE Interact is reachable and screen pops are received.
 * - disconnected: ACE Interact, its server connection or the JS API popup was lost.
 * - unavailable:  the JS API bundle could not be loaded from ACE.
 */
export type AceStatus = 'disabled' | 'connecting' | 'connected' | 'disconnected' | 'unavailable';

interface AceState {
  status: AceStatus;
  setStatus: (status: AceStatus) => void;
}

export const useAceStore = create<AceState>((set) => ({
  status: 'disabled',
  setStatus: (status) => set({ status }),
}));
