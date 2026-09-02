import { APPLICATION, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { resolveSupportManagementApiTarget, SupportManagementApiTarget } from '@/config/api-config';
import {
  IafVofInvestigationClassificationPolicy,
  resolveIafVofInvestigationClassificationPolicy,
} from '@/config/iaf-vof-investigation-classification';
import { getSupportInvestigationProfile, SupportInvestigationProfile } from '@/config/support-investigation-profile';
import {
  SupportInvestigationRuntimeProfileDto,
  SupportInvestigationState,
  SupportManagementLabelFilterProfileDto,
} from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';
import { logger } from '@/utils/logger';

import { FeatureFlagService, featureFlagService } from './feature-flag.service';
import { getNewErrandDefaults } from './support-errand.service';

export type SupportErrandClassificationOwner = 'generic-errand' | 'investigation' | 'unavailable';
export type SupportRegistrationState = 'enabled' | 'disabled' | 'unavailable';

/**
 * Owns whether a configured investigation profile is effective at runtime.
 * `unavailable` is deliberately distinct from feature-off: protected writes
 * must fail closed while unrelated errand fields can still be saved.
 */
export class SupportInvestigationPolicyService {
  private readonly featureFlagService: FeatureFlagService;
  private readonly configuredProfile: SupportInvestigationProfile;
  private readonly namespace: string | undefined;
  private readonly supportManagementApiTarget: SupportManagementApiTarget;
  private readonly resolvedIafVofClassificationPolicy: IafVofInvestigationClassificationPolicy | undefined;

  constructor(
    featureFlags: FeatureFlagService = featureFlagService,
    configuredProfile = getSupportInvestigationProfile(APPLICATION),
    namespace = SUPPORTMANAGEMENT_NAMESPACE,
    supportManagementApiTarget = resolveSupportManagementApiTarget(),
  ) {
    this.featureFlagService = featureFlags;
    this.configuredProfile = configuredProfile;
    this.namespace = namespace;
    this.supportManagementApiTarget = supportManagementApiTarget;
    this.resolvedIafVofClassificationPolicy = resolveIafVofInvestigationClassificationPolicy(configuredProfile);
  }

  async getState(user: User): Promise<SupportInvestigationState> {
    if (this.configuredProfile.documents.length === 0) return 'inactive';
    if (!this.namespace?.trim()) return 'unavailable';
    if (
      this.configuredProfile.requiredSupportManagementApiTarget &&
      this.configuredProfile.requiredSupportManagementApiTarget !== this.supportManagementApiTarget
    ) {
      return 'unavailable';
    }

    try {
      const enabled = await this.featureFlagService.getFreshFeatureEnabled(user, 'useInvestigation', this.namespace);
      if (enabled === undefined) return 'inactive';
      if (!enabled) return 'inactive';
      return 'active';
    } catch (error) {
      logger.error('Unable to resolve the SupportManagement investigation feature flag', error);
      return 'unavailable';
    }
  }

  async getRuntimeProfile(user: User): Promise<SupportInvestigationRuntimeProfileDto> {
    const state = await this.getState(user);
    const registrationState = this.registrationStateForInvestigationState(state);
    return Object.freeze({
      application: this.configuredProfile.application,
      documents: this.configuredProfile.documents,
      ...(this.configuredProfile.labelFilter ? { labelFilter: this.configuredProfile.labelFilter } : {}),
      state,
      registration: Object.freeze({ mode: registrationState === 'enabled' ? 'enabled' : 'disabled' }),
    });
  }

  async getClassificationOwner(user: User): Promise<SupportErrandClassificationOwner> {
    if (!this.resolvedIafVofClassificationPolicy) return 'generic-errand';

    const state = await this.getState(user);
    if (state === 'active') return 'investigation';
    if (state === 'inactive') return 'generic-errand';
    return 'unavailable';
  }

  /**
   * Registration is independent of investigation for ordinary applications.
   * For a classification policy app, however, an unavailable policy would
   * create an errand that neither the generic nor investigation command can
   * finish classifying, so fail closed before creating it.
   */
  async getRegistrationState(user: User): Promise<SupportRegistrationState> {
    if (!getNewErrandDefaults(this.configuredProfile.application)) return 'disabled';
    if (!this.resolvedIafVofClassificationPolicy) return 'enabled';
    return this.registrationStateForInvestigationState(await this.getState(user));
  }

  get profile(): SupportInvestigationProfile {
    return this.configuredProfile;
  }

  get iafVofClassificationPolicy(): IafVofInvestigationClassificationPolicy | undefined {
    return this.resolvedIafVofClassificationPolicy;
  }

  get labelFilter(): SupportManagementLabelFilterProfileDto | undefined {
    return this.configuredProfile.labelFilter;
  }

  /**
   * Copying investigation JSON parameters is only valid while the application
   * capability is active. Document authorization itself belongs to Support
   * Management and is verified through its document endpoint by the handover
   * controller.
   */
  async assertInvestigationTransferActive(user: User): Promise<void> {
    const state = await this.getState(user);
    if (state === 'inactive') {
      throw new HttpException(409, 'Investigation document transfer is not active for this application');
    }
    if (state === 'unavailable') {
      throw new HttpException(503, 'Investigation document transfer policy is temporarily unavailable');
    }
  }

  private registrationStateForInvestigationState(state: SupportInvestigationState): SupportRegistrationState {
    if (!getNewErrandDefaults(this.configuredProfile.application)) return 'disabled';
    return this.resolvedIafVofClassificationPolicy && state === 'unavailable' ? 'unavailable' : 'enabled';
  }
}
