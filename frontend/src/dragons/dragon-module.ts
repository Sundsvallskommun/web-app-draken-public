import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

/**
 * Every dragon Draken can run as. The order is cosmetic; the shell's registry is keyed by id, and
 * `NEXT_PUBLIC_APPLICATION` must equal one of these exactly.
 */
export const DRAGON_IDS = Object.freeze([
  'KC',
  'KA',
  'MEX',
  'PT',
  'ROB',
  'LOP',
  'IK',
  'MSVA',
  'SE',
  'BOU',
  'LOK',
  'IAF',
  'VOF',
  'AOT',
] as const);

export type DragonId = (typeof DRAGON_IDS)[number];

/**
 * What one dragon supplies to the domains. A module is data and implementations of contracts the
 * domains own; it never asks which application is running and never carries logic that belongs
 * to a domain. Contracts are added here by the domain that owns them.
 */
export interface DragonModule {
  readonly id: DragonId;
  /**
   * Overrides of supportmanagement's errand policy; the shell merges them over the domain
   * default. Leave the key out entirely for a dragon that uses the defaults - a member set to
   * `undefined` is rejected at startup rather than silently falling back.
   */
  readonly supportErrandPolicy?: Partial<SupportErrandPolicy>;
}
