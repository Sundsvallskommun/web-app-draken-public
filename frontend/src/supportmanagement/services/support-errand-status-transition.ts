export interface SupportErrandStatusSnapshot {
  status?: string;
  version?: number;
}

export interface SupportErrandStatusTransitionChanges {
  resolution?: string;
  suspension?: {
    suspendedFrom?: string;
    suspendedTo?: string;
  };
}

export interface SupportErrandStatusTransitionRequest extends SupportErrandStatusTransitionChanges {
  expectedVersion: number;
  expectedStatus: string;
  status: string;
}

/** Builds the exact command from a fresh errand snapshot; stale state is rejected by the backend. */
export const buildSupportErrandStatusTransitionRequest = (
  snapshot: SupportErrandStatusSnapshot,
  status: string,
  changes: SupportErrandStatusTransitionChanges = {}
): SupportErrandStatusTransitionRequest => {
  if (!Number.isSafeInteger(snapshot.version) || snapshot.version! < 0) {
    throw new Error('Support errand is missing a valid version');
  }
  if (!snapshot.status) {
    throw new Error('Support errand is missing its current status');
  }
  if (!status) {
    throw new Error('Target status is required');
  }

  return {
    expectedVersion: snapshot.version!,
    expectedStatus: snapshot.status,
    status,
    ...changes,
  };
};
