import { configureMessageTemplateNamespace } from '@common/services/message-template-body-service';
import type { AppConfig, AppConfigFeatures } from '@config/appconfig';
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

/**
 * Investigation variants are mutually exclusive implementations of the same tab.
 * Invalid combinations are rejected before any variant is selected.
 * `bootstrap.ts` runs it against the environment flags at startup; `layout/app-layout.tsx` runs
 * it again after Adminpanel's runtime flags are applied, since those can flip the same two flags.
 */
export const validateDragonConfiguration = (features: AppConfigFeatures): void => {
  if (features.useAvvikelseInvestigation && features.useAotInvestigation) {
    throw new Error(
      'Invalid dragon configuration: useAvvikelseInvestigation and useAotInvestigation are mutually exclusive investigation variants. Enable at most one.'
    );
  }
};

/** Flags may enable features inside a build, but cannot replace the built application. */
export const validateDragonDeployment = (identity: string, builtIdentity: string, config: AppConfig): void => {
  if (!isDragonId(identity)) throw new Error(`Unknown dragon "${identity}".`);
  if (identity !== builtIdentity) {
    throw new Error(`Dragon ${identity} cannot run in a ${builtIdentity} frontend build.`);
  }
  const definition = getDragonDefinition(identity);
  const caseData = definition.domain === 'casedata';
  if (config.isCaseData !== caseData || config.isSupportManagement !== !caseData) {
    throw new Error(
      `Domain flags do not match the ${builtIdentity} frontend build. Check isCaseData and isSupportManagement.`
    );
  }
  validateDragonConfiguration(config.features);
  if (config.features.useAvvikelseInvestigation && definition.investigation !== 'avvikelse') {
    throw new Error('Avvikelse investigation requires a dragon that composes Avvikelse.');
  }
  if (config.features.useAotInvestigation && definition.investigation !== 'aot') {
    throw new Error('AOT investigation requires a dragon that composes AOT.');
  }
};

export interface ComposeDragonInput {
  readonly identity: string;
  readonly dragon: DragonModule;
  readonly features: AppConfigFeatures;
}

/** Validates, resolves the dragon and hands its contracts to the domains. Returns the resolved module. */
export const composeDragon = ({ identity, dragon, features }: ComposeDragonInput): DragonModule => {
  validateDragonConfiguration(features);
  if (!isDragonId(identity))
    throw new Error(`Unknown dragon "${identity}". NEXT_PUBLIC_APPLICATION must be one of: ${DRAGON_IDS.join(', ')}.`);
  if (identity !== dragon.id) throw new Error(`Dragon ${identity} cannot run in a ${dragon.id} frontend build.`);
  configureMessageTemplateNamespace(dragon.id.toLowerCase());
  configureSupportErrandPolicy(buildSupportErrandPolicy(dragon));
  return dragon;
};
