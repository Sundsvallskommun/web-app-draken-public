import { configureMessageTemplateNamespace } from '@common/services/message-template-body-service';
import type { AppConfig } from '@config/appconfig';
import { DRAGON_IDS, type DragonModule, getDragonDefinition } from '@dragons/dragon-module';
import {
  configureSupportErrandPolicy,
  type SupportErrandPolicy,
} from '@supportmanagement/policy/support-errand-policy';

import { isDragonId } from './app-identity';

/** Validate an explicitly selected policy; the shell never invents business defaults. */
export const buildSupportErrandPolicy = (dragon: DragonModule): SupportErrandPolicy => {
  const policy = dragon.supportErrandPolicy;
  if (!policy) throw new Error(`Dragon "${dragon.id}" must explicitly select a support errand policy.`);
  for (const key of ['ongoingStatuses', 'resolutions', 'defaultResolution', 'solvedStatusLabel'] as const) {
    if (policy[key] === undefined) throw new Error(`Dragon "${dragon.id}" is missing supportErrandPolicy.${key}.`);
  }
  return Object.freeze(policy);
};

/** Capabilities may enable features inside the catalog's fixed application and domain. */
export const validateDragonDeployment = (identity: string, builtIdentity: string, config: AppConfig): void => {
  if (!isDragonId(identity)) throw new Error(`Unknown dragon "${identity}".`);
  if (identity !== builtIdentity) {
    throw new Error(`Dragon ${identity} cannot run in a ${builtIdentity} frontend build.`);
  }
  const definition = getDragonDefinition(identity);
  const caseData = definition.domain === 'casedata';
  if (config.isCaseData !== caseData || config.isSupportManagement !== !caseData) {
    throw new Error(
      `Domain configuration does not match the ${builtIdentity} frontend build. Rebuild with the catalog's domain.`
    );
  }
};

export interface ComposeDragonInput {
  readonly identity: string;
  readonly dragon: DragonModule;
}

/** Validates, resolves the dragon and hands its contracts to the domains. Returns the resolved module. */
export const composeDragon = ({ identity, dragon }: ComposeDragonInput): DragonModule => {
  if (!isDragonId(identity))
    throw new Error(`Unknown dragon "${identity}". NEXT_PUBLIC_APPLICATION must be one of: ${DRAGON_IDS.join(', ')}.`);
  if (identity !== dragon.id) throw new Error(`Dragon ${identity} cannot run in a ${dragon.id} frontend build.`);
  configureMessageTemplateNamespace(dragon.id.toLowerCase());
  if (getDragonDefinition(dragon.id).domain === 'supportmanagement') {
    configureSupportErrandPolicy(buildSupportErrandPolicy(dragon));
  } else {
    if (dragon.supportErrandPolicy !== null)
      throw new Error(`CaseData dragon "${dragon.id}" must not select an SM policy.`);
    configureSupportErrandPolicy(undefined);
  }
  return dragon;
};
