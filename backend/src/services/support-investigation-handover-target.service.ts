import {
  resolveSupportInvestigationHandoverTargets,
  supportInvestigationHandoverTargetIdentity,
} from '@/config/support-investigation-handover-targets';
import { HttpException } from '@/exceptions/HttpException';

export interface RequestedSupportInvestigationHandoverTarget {
  readonly municipalityId?: string;
  readonly namespace: string;
}

/**
 * Owns the deployment boundary for moving protected investigation documents
 * to another Support Management namespace. It deliberately does not infer
 * compatibility from the source application or from a feature flag.
 */
export class SupportInvestigationHandoverTargetService {
  private readonly allowedDocumentKeysByTarget: ReadonlyMap<string, ReadonlySet<string>> | undefined;

  constructor(configuredTargets = process.env.SUPPORT_INVESTIGATION_HANDOVER_TARGETS) {
    const targets = resolveSupportInvestigationHandoverTargets(configuredTargets);
    this.allowedDocumentKeysByTarget = targets
      ? new Map(targets.map(target => [supportInvestigationHandoverTargetIdentity(target), new Set(target.documentKeys)]))
      : undefined;
  }

  assertCanReceiveProtectedDocuments(
    sourceMunicipalityId: string,
    requestedTarget: RequestedSupportInvestigationHandoverTarget,
    requiredDocumentKeys: readonly string[],
  ): void {
    if (!this.allowedDocumentKeysByTarget) {
      throw new HttpException(503, 'Investigation handover target policy is unavailable');
    }

    const requestedMunicipalityId = requestedTarget.municipalityId || sourceMunicipalityId;
    if (requestedMunicipalityId !== requestedMunicipalityId.trim() || requestedTarget.namespace !== requestedTarget.namespace.trim()) {
      throw new HttpException(400, 'Investigation handover target must use canonical identifiers');
    }

    const target = {
      municipalityId: requestedMunicipalityId,
      namespace: requestedTarget.namespace,
    };
    if (!target.municipalityId || !target.namespace) {
      throw new HttpException(400, 'Investigation handover target is incomplete');
    }

    const allowedDocumentKeys = this.allowedDocumentKeysByTarget.get(supportInvestigationHandoverTargetIdentity(target));
    if (!allowedDocumentKeys) {
      throw new HttpException(409, 'Target namespace is not configured to receive protected investigation documents');
    }
    const missingDocumentKey = requiredDocumentKeys.find(key => !allowedDocumentKeys.has(key));
    if (missingDocumentKey) {
      throw new HttpException(409, `Target namespace is not configured to receive investigation document ${missingDocumentKey}`);
    }
  }
}
