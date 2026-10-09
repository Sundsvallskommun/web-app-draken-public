import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { IAF_VOF_HIGH_HSL_RISK_LABEL } from '@/config/iaf-vof-high-hsl-risk';
import type { Errand, Labels } from '@/data-contracts/supportmanagement/data-contracts';
import { User } from '@/interfaces/users.interface';
import ApiService from '@/services/api.service';
import { apiURL } from '@/utils/util';

import { buildLabelPresenceUpdate } from './errand-label-presence';
import { getErrandVersion } from './support-errand.service';

interface ApplyHighHslRiskLabelRequest {
  readonly municipalityId: string;
  readonly errandId: string;
  readonly user: User;
  /** Whether the errand should carry the label. */
  readonly present: boolean;
  /** The errand version the investigation write left; the label write follows it directly or not at all. */
  readonly expectedVersion: number;
}

/**
 * Writes the high HSL risk label onto an errand, right after the investigation write that decided it.
 *
 * The write is conditioned on the version that investigation write left, so it lands directly on top of it
 * or not at all: anybody else having written in between leaves the label for the next completed save rather
 * than racing them. A namespace without the label in its metadata is left alone.
 */
export class InvestigationRiskLabelService {
  constructor(
    private readonly apiService: Pick<ApiService, 'get' | 'patch'> = new ApiService(),
    private readonly namespace: string = SUPPORTMANAGEMENT_NAMESPACE ?? '',
  ) {}

  /** Answers the errand version after its own write, or `undefined` when it wrote nothing. */
  async applyHighHslRiskLabel({
    municipalityId,
    errandId,
    user,
    present,
    expectedVersion,
  }: ApplyHighHslRiskLabelRequest): Promise<number | undefined> {
    const baseURL = apiURL(apiServiceName('supportmanagement'));
    const url = `${municipalityId}/${this.namespace}/errands/${errandId}`;
    const [errand, labels] = await Promise.all([
      this.apiService.get<Errand>({ url, baseURL, includeResponseHeaders: true, propagateClientError: true, mapUnauthorizedToForbidden: true }, user),
      this.apiService.get<Labels | null>(
        { url: `${municipalityId}/${this.namespace}/metadata/labels`, baseURL, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      ),
    ]);
    const version = getErrandVersion(errand.data, errand.headers?.etag);
    if (version !== expectedVersion) return undefined;

    const update = buildLabelPresenceUpdate({
      currentLabels: errand.data.labels,
      labelStructure: labels.data?.labelStructure,
      resourcePath: IAF_VOF_HIGH_HSL_RISK_LABEL,
      present,
    });
    if (!update) return undefined;

    await this.apiService.patch<Errand, { labels: { id: string }[] }>(
      {
        url,
        baseURL,
        data: { labels: update },
        headers: { 'If-Match': `"${version}"` },
        followLocation: false,
        propagateClientError: true,
        mapUnauthorizedToForbidden: true,
        // Derived from the investigation the user just saved, which already notified.
        notifySubscribers: false,
      },
      user,
    );
    return version + 1;
  }
}
