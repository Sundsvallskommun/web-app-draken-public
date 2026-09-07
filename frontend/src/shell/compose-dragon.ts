import { configureMessageTemplateNamespace } from '@common/services/message-template-body-service';
import type { AppConfig } from '@config/appconfig';
import { DRAGON_IDS, type DragonModule, getDragonDefinition } from '@dragons/dragon-module';
import {
  configureSupportErrandPolicy,
  defaultSupportErrandPolicy,
  type SupportErrandPolicy,
} from '@supportmanagement/policy/support-errand-policy';

import { isDragonId } from './app-identity';

/** The domain default with the dragon's overrides on top. */
export const buildSupportErrandPolicy = (dragon: DragonModule): SupportErrandPolicy => {
  const policy: SupportErrandPolicy = { ...defaultSupportErrandPolicy, ...dragon.supportErrandPolicy };
  for (const key of Object.keys(defaultSupportErrandPolicy) as (keyof SupportErrandPolicy)[]) {
    if (policy[key] === undefined) {
      throw new Error(
        `Dragon "${dragon.id}" sets supportErrandPolicy.${key} to undefined. Omit the key to keep the default.`
      );
    }
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
  configureSupportErrandPolicy(buildSupportErrandPolicy(dragon));
  return dragon;
};
