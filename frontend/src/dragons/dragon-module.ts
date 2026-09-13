import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import dragons from '../../../dragons.json';

/**
 * Every dragon Draken can run as. The order is cosmetic; each build selects one application, and
 * `NEXT_PUBLIC_APPLICATION` must equal one of these exactly.
 */
export type DragonId = keyof typeof dragons;

export const DRAGON_IDS = Object.freeze(Object.keys(dragons) as DragonId[]);

export const getDragonDefinition = (id: DragonId) => dragons[id];

/**
 * What one dragon supplies to the domains. A module is data and implementations of contracts the
 * domains own; it never asks which application is running and never carries logic that belongs
 * to a domain. Contracts are added here by the domain that owns them.
 */
export interface DragonModule {
  readonly id: DragonId;
  /** Complete policy explicitly selected by an SM dragon; null for a CaseData dragon. */
  readonly supportErrandPolicy: SupportErrandPolicy | null;
}
