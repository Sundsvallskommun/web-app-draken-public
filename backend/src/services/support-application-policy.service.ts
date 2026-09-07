import { APPLICATION, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { resolveSupportManagementApiTarget, SupportManagementApiTarget } from '@/config/api-config';
import { getSupportApplicationProfile, SupportApplicationProfile } from '@/config/support-application-profile';
import type { SupportInvestigationClassificationPolicy } from '@/config/support-investigation-classification';
import {
  SupportApplicationRuntimeProfileDto,
  SupportInvestigationState,
  SupportManagementLabelFilterProfileDto,
} from '@/dtos/support-application-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';
import { logApplicationFailure } from '@/services/request-diagnostics';

import { FeatureFlagService, featureFlagService } from './feature-flag.service';

export type SupportErrandClassificationOwner = 'generic-errand' | 'investigation' | 'unavailable';
export type SupportRegistrationState = 'enabled' | 'disabled' | 'unavailable';

/**
 * Owns the application runtime profile: investigation policy, registration and label filters.
 * `unavailable` is deliberately distinct from feature-off: protected writes
 * must fail closed while unrelated errand fields can still be saved.
 */
export class SupportApplicationPolicyService {
  private readonly featureFlagService: FeatureFlagService;
  private readonly configuredProfile: SupportApplicationProfile;
  private readonly namespace: string | undefined;
  private readonly supportManagementApiTarget: SupportManagementApiTarget;
  private readonly resolvedClassificationPolicy: SupportInvestigationClassificationPolicy | undefined;

  constructor(
    featureFlags: FeatureFlagService = featureFlagService,
    configuredProfile = getSupportApplicationProfile(APPLICATION),
    namespace = SUPPORTMANAGEMENT_NAMESPACE,
    supportManagementApiTarget = resolveSupportManagementApiTarget(),
  ) {
    this.featureFlagService = featureFlags;
    this.configuredProfile = configuredProfile;
    this.namespace = namespace;
    this.supportManagementApiTarget = supportManagementApiTarget;
    this.resolvedClassificationPolicy = configuredProfile.classificationPolicy;
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

    // The same reviewed deployment flag is supplied to both services. A configured
    // profile supplies implementation, never implicit activation.
    if (!this.featureFlagService.isConfigured()) {
      return process.env.NEXT_PUBLIC_USE_INVESTIGATION === 'true' ? 'active' : 'inactive';
    }

    try {
      const enabled = await this.featureFlagService.getFreshFeatureEnabled(user, 'useInvestigation', this.namespace);
      if (enabled === undefined) return 'inactive';
      if (!enabled) return 'inactive';
      return 'active';
    } catch (error) {
      logApplicationFailure('Unable to resolve the SupportManagement investigation feature flag', error);
      return 'unavailable';
    }
  }

  async getRuntimeProfile(user: User): Promise<SupportApplicationRuntimeProfileDto> {
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
    if (!this.resolvedClassificationPolicy) return 'generic-errand';

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
    if (this.configuredProfile.registration.mode === 'disabled') return 'disabled';
    if (!this.resolvedClassificationPolicy) return 'enabled';
    return this.registrationStateForInvestigationState(await this.getState(user));
  }

  get profile(): SupportApplicationProfile {
    return this.configuredProfile;
  }

  get classificationPolicy(): SupportInvestigationClassificationPolicy | undefined {
    return this.resolvedClassificationPolicy;
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
    if (this.configuredProfile.registration.mode === 'disabled') return 'disabled';
    return this.resolvedClassificationPolicy && state === 'unavailable' ? 'unavailable' : 'enabled';
  }
}
