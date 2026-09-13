import { DRAGON_IDS, type DragonId, type DragonModule, getDragonDefinition } from '@dragons/dragon-module';
import {
  configureSupportErrandPolicy,
  type SupportErrandPolicy,
} from '@supportmanagement/policy/support-errand-policy';

import { isDragonId } from './app-identity';

export type DragonRegistry = Readonly<Record<DragonId, DragonModule>>;

export const resolveDragonModule = (identity: string, registry: DragonRegistry): DragonModule => {
  if (!isDragonId(identity))
    throw new Error(`Unknown dragon "${identity}". NEXT_PUBLIC_APPLICATION must be one of: ${DRAGON_IDS.join(', ')}.`);
  const dragon = registry[identity];
  if (dragon?.id !== identity) throw new Error(`Dragon registry does not match "${identity}".`);
  return dragon;
};

export const buildSupportErrandPolicy = (dragon: DragonModule): SupportErrandPolicy => {
  const policy = dragon.supportErrandPolicy;
  if (!policy) throw new Error(`Dragon "${dragon.id}" must explicitly select a support errand policy.`);
  for (const key of ['ongoingStatuses', 'resolutions', 'defaultResolution', 'solvedStatusLabel'] as const) {
    if (policy[key] === undefined) throw new Error(`Dragon "${dragon.id}" is missing supportErrandPolicy.${key}.`);
  }
  return Object.freeze(policy);
};

/** Each module graph is composed before its first render; there is no implicit business default. */
export const composeDragon = ({ identity, registry }: { identity: string; registry: DragonRegistry }): DragonModule => {
  const dragon = resolveDragonModule(identity, registry);
  if (getDragonDefinition(dragon.id).domain === 'casedata') {
    if (dragon.supportErrandPolicy !== null)
      throw new Error(`CaseData dragon "${dragon.id}" must not select an SM policy.`);
    configureSupportErrandPolicy(undefined);
  } else {
    configureSupportErrandPolicy(buildSupportErrandPolicy(dragon));
  }
  return dragon;
};
