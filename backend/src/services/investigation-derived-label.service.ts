import { SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import type { Errand, Labels } from '@/data-contracts/supportmanagement/data-contracts';
import { User } from '@/interfaces/users.interface';
import ApiService from '@/services/api.service';
import { apiURL } from '@/utils/util';

import { buildLabelPresenceUpdate } from './errand-label-presence';
import { getErrandVersion } from './support-errand.service';

/** One label a saved investigation document decides: whether the errand should carry it, and whether writing it notifies. */
export interface DerivedLabelChange {
  readonly resourcePath: string;
  readonly present: boolean;
  /**
   * Whether the write tells the errand's subscribers. A label the system derives on its own is written silently; one
   * that records a handler's own decision notifies, since a subscription profile may be what passes it on.
   */
  readonly notifySubscribers: boolean;
}

interface ApplyDerivedLabelRequest extends DerivedLabelChange {
  readonly municipalityId: string;
  readonly errandId: string;
  readonly user: User;
  /** The errand version the document write left; the label write follows it directly or not at all. */
  readonly expectedVersion: number;
}

/**
 * Writes a label onto an errand, right after the investigation write that decided it - the high HSL risk the unit
 * manager's investigation assesses, or the HSL event analysis MAS/MAR decides to make.
 *
 * The write is conditioned on the version that document write left, so it lands directly on top of it or not at
 * all: anybody else having written in between leaves the label for the next save rather than racing them. A
 * namespace without the label in its metadata is left alone.
 */
export class InvestigationDerivedLabelService {
  constructor(
    private readonly apiService: Pick<ApiService, 'get' | 'patch'> = new ApiService(),
    private readonly namespace: string = SUPPORTMANAGEMENT_NAMESPACE ?? '',
  ) {}

  /**
   * Answers the errand version after its own write, or `undefined` when it wrote nothing.
   *
   * The version is read back, never counted: how many steps Support Management takes for a label write is its
   * own business, and a version one step short makes the caller's next errand write - the classification saved
   * with the investigation - somebody else's change.
   */
  async applyDerivedLabel({
    municipalityId,
    errandId,
    user,
    resourcePath,
    present,
    notifySubscribers,
    expectedVersion,
  }: ApplyDerivedLabelRequest): Promise<number | undefined> {
    const baseURL = apiURL(apiServiceName('supportmanagement'));
    const url = `${municipalityId}/${this.namespace}/errands/${errandId}`;
    const readErrandVersion = async (): Promise<{ version: number; labels: Errand['labels'] }> => {
      const errand = await this.apiService.get<Errand>(
        { url, baseURL, includeResponseHeaders: true, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      );
      return { version: getErrandVersion(errand.data, errand.headers?.etag), labels: errand.data.labels };
    };
    const [errand, labels] = await Promise.all([
      readErrandVersion(),
      this.apiService.get<Labels | null>(
        { url: `${municipalityId}/${this.namespace}/metadata/labels`, baseURL, propagateClientError: true, mapUnauthorizedToForbidden: true },
        user,
      ),
    ]);
    if (errand.version !== expectedVersion) return undefined;

    const update = buildLabelPresenceUpdate({
      currentLabels: errand.labels,
      labelStructure: labels.data?.labelStructure,
      resourcePath,
      present,
    });
    if (!update) return undefined;

    await this.apiService.patch<Errand, { labels: { id: string }[] }>(
      {
        url,
        baseURL,
        data: { labels: update },
        headers: { 'If-Match': `"${errand.version}"` },
        followLocation: false,
        propagateClientError: true,
        mapUnauthorizedToForbidden: true,
        // Silenced only for a label the system derives on its own; a handler's decision notifies as usual.
        ...(notifySubscribers ? {} : { notifySubscribers: false }),
      },
      user,
    );
    return (await readErrandVersion()).version;
  }
}
