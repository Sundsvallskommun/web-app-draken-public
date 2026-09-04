import type { AppConfigFeatures } from '@config/appconfig';
import { DRAGON_IDS, type DragonId, type DragonModule } from '@dragons/dragon-module';
import {
  configureSupportErrandPolicy,
  defaultSupportErrandPolicy,
  type SupportErrandPolicy,
} from '@supportmanagement/policy/support-errand-policy';

import { isDragonId } from './app-identity';

export type DragonRegistry = Readonly<Record<DragonId, DragonModule>>;

/**
 * The composition steps, kept as pure functions of their inputs so they can be unit-tested with
 * fixtures. `bootstrap.ts` is the only caller that feeds them the real identity, registry and
 * feature flags. Every failure here throws: a misconfigured container must fail at startup, not
 * run as the wrong dragon.
 */

export const resolveDragonModule = (identity: string, registry: DragonRegistry): DragonModule => {
  if (!isDragonId(identity)) {
    throw new Error(`Unknown dragon "${identity}". NEXT_PUBLIC_APPLICATION must be one of: ${DRAGON_IDS.join(', ')}.`);
  }
  return registry[identity];
};

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
 * Capability flags combine freely, with one exception: the investigation variants are mutually
 * exclusive implementations of the same tab. `investigation-variant-registry.ts` degrades a double
 * enable to first-wins so a bad deploy still renders; this check is the loud layer in front of it.
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

export interface ComposeDragonInput {
  readonly identity: string;
  readonly registry: DragonRegistry;
  readonly features: AppConfigFeatures;
}

/** Validates, resolves the dragon and hands its contracts to the domains. Returns the resolved module. */
export const composeDragon = ({ identity, registry, features }: ComposeDragonInput): DragonModule => {
  validateDragonConfiguration(features);
  const dragon = resolveDragonModule(identity, registry);
  configureSupportErrandPolicy(buildSupportErrandPolicy(dragon));
  return dragon;
};
