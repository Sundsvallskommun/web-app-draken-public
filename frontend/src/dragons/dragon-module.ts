import type { RegistryFieldsType } from '@rjsf/utils';
import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import dragons from './dragons.json';

export type DragonId = keyof typeof dragons;
export const DRAGON_IDS = Object.freeze(Object.keys(dragons) as DragonId[]);
export const getDragonDefinition = (id: DragonId) => dragons[id];

/** Application selection of domain-owned behavior. */
export interface DragonModule {
  readonly id: DragonId;
  /** Field implementations selected by this application, separate from the shared JSON engine. */
  readonly schemaFields?: RegistryFieldsType;
  readonly supportErrandPolicy: SupportErrandPolicy | null;
}
