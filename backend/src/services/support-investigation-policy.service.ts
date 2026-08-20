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
import { SupportInvestigationAccessService } from './support-investigation-access.service';

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
  private readonly accessService: SupportInvestigationAccessService;
  private readonly supportManagementApiTarget: SupportManagementApiTarget;
  private readonly resolvedIafVofClassificationPolicy: IafVofInvestigationClassificationPolicy | undefined;

  constructor(
    featureFlags: FeatureFlagService = featureFlagService,
    configuredProfile = getSupportInvestigationProfile(APPLICATION),
    namespace = SUPPORTMANAGEMENT_NAMESPACE,
    accessService = new SupportInvestigationAccessService(configuredProfile),
    supportManagementApiTarget = resolveSupportManagementApiTarget(),
  ) {
    this.featureFlagService = featureFlags;
    this.configuredProfile = configuredProfile;
    this.namespace = namespace;
    this.accessService = accessService;
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
      return this.accessService.configured ? 'active' : 'unavailable';
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
      documents: Object.freeze(
        this.configuredProfile.documents.map(document =>
          Object.freeze({ ...document, permissions: Object.freeze(this.accessService.permissionsFor(user, document.key)) }),
        ),
      ),
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

  get protectsJsonParameters(): boolean {
    return this.configuredProfile.documents.length > 0;
  }

  hasProtectedJsonParameters<T extends { jsonParameters?: readonly { key?: string }[] }>(errand: T): boolean {
    return this.accessService.protectedJsonParameterKeys(errand).length > 0;
  }

  assertCanReadDocument(user: User, key: string): void {
    this.accessService.assertCanRead(user, key);
  }

  assertCanWriteDocument(user: User, key: string): void {
    this.accessService.assertCanWrite(user, key);
  }

  filterProtectedJsonParameters<T extends { jsonParameters?: readonly { key?: string }[] }>(errand: T, user: User): T {
    return this.accessService.filterProtectedJsonParameters(errand, user);
  }

  filterProtectedRevisionDifference<T extends { operations?: readonly { path?: string }[] }>(difference: T, user: User): T {
    return this.accessService.filterProtectedRevisionDifference(difference, user);
  }

  /**
   * Handover copies JSON parameters as one all-or-nothing collection. A
   * protected document may leave the application only while the investigation
   * capability is active and the caller can read every protected document
   * present on the source errand.
   */
  async assertCanTransferProtectedJsonParameters<T extends { jsonParameters?: readonly { key?: string }[] }>(errand: T, user: User): Promise<void> {
    if (this.accessService.protectedJsonParameterKeys(errand).length === 0) return;

    const state = await this.getState(user);
    if (state === 'inactive') {
      throw new HttpException(409, 'Investigation document transfer is not active for this application');
    }
    if (state === 'unavailable') {
      throw new HttpException(503, 'Investigation document transfer policy is temporarily unavailable');
    }

    this.accessService.assertCanReadProtectedJsonParameters(errand, user);
  }

  private registrationStateForInvestigationState(state: SupportInvestigationState): SupportRegistrationState {
    if (!getNewErrandDefaults(this.configuredProfile.application)) return 'disabled';
    return this.resolvedIafVofClassificationPolicy && state === 'unavailable' ? 'unavailable' : 'enabled';
  }
}
