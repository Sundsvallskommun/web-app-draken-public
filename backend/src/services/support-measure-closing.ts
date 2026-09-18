import type { Measure } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import type { User } from '@/interfaces/users.interface';

import type ApiService from './api.service';
import { CLOSED_SUPPORT_ERRAND_STATUS } from './support-errand.service';
import { isPlannedApprovedMeasure } from './support-measure-follow-up';

/**
 * The applications whose errands may not be closed while a measure is still outstanding.
 *
 * Named here rather than derived from the measures configuration, because registering measures and
 * having to finish them before closing are two different decisions: a deployment could reasonably do
 * the first without the second. An application missing from this set closes exactly as it always has.
 */
const CLOSE_REQUIRES_HANDLED_MEASURES: ReadonlySet<string> = new Set(['IAF', 'VOF']);

export const closeRequiresHandledMeasures = (application?: string): boolean =>
  CLOSE_REQUIRES_HANDLED_MEASURES.has((application ?? '').trim().toUpperCase());

/** A measure nobody has decided on: it was proposed and is still only a proposal. */
const isUndecidedMeasure = (measure: Measure): boolean => !measure.accept;

/**
 * An approved, planned measure that has not been followed up. The follow-up writes `executed`
 * together with its answers, so an unexecuted one is exactly one still waiting - the same rule the
 * planned-measures overview lists an errand by.
 */
const isUnfollowedMeasure = (measure: Measure): boolean => isPlannedApprovedMeasure(measure) && !measure.executed;

/**
 * Whether a measure still asks something of somebody. A rejected measure and one registered as
 * already carried out are both finished business.
 */
export const isUnhandledMeasure = (measure: Measure): boolean => isUndecidedMeasure(measure) || isUnfollowedMeasure(measure);

/** What is outstanding, counted so the refusal can say which of the two it is. */
export interface UnhandledMeasureCounts {
  readonly undecided: number;
  readonly unfollowed: number;
}

export const countUnhandledMeasures = (measures: readonly Measure[]): UnhandledMeasureCounts => ({
  undecided: measures.filter(isUndecidedMeasure).length,
  unfollowed: measures.filter(isUnfollowedMeasure).length,
});

const measureCount = (count: number, singular: string, plural: string): string => `${count} ${count === 1 ? singular : plural}`;

/**
 * Why the errand cannot be closed, in the words the handler needs to act: which measures are in the
 * way, and what has to happen to them. Undefined when nothing is outstanding.
 */
export const unhandledMeasuresMessage = (measures: readonly Measure[]): string | undefined => {
  const { undecided, unfollowed } = countUnhandledMeasures(measures);
  if (undecided === 0 && unfollowed === 0) return undefined;

  const parts: string[] = [];
  if (undecided > 0) parts.push(`${measureCount(undecided, 'åtgärd', 'åtgärder')} väntar på beslut`);
  if (unfollowed > 0) parts.push(`${measureCount(unfollowed, 'åtgärd', 'åtgärder')} är inte uppföljd${unfollowed === 1 ? '' : 'a'}`);

  return `Ärendet kan inte avslutas förrän alla åtgärder är hanterade: ${parts.join(' och ')}.`;
};

interface AssertMeasuresHandledRequest {
  readonly apiService: Pick<ApiService, 'get'>;
  readonly user: User;
  /** The errand's upstream path, without a trailing slash. */
  readonly errandUrl: string;
  readonly baseURL: string;
  /** The status the write would leave the errand in. */
  readonly status: string | undefined;
  /** Whether this application requires every measure handled before an errand is closed. */
  readonly required: boolean;
}

/**
 * Refuses to close an errand while a measure still asks something of somebody.
 *
 * Called from every write that can close one - the explicit status transition and the phase move
 * that carries a status with it - so the rule does not depend on which button the handler pressed.
 * The measures are read here rather than taken from an errand read for another purpose: this is the
 * assertion the refusal rests on, and a read that happens to omit them would let the errand through.
 */
export const assertMeasuresHandledBeforeClose = async ({
  apiService,
  user,
  errandUrl,
  baseURL,
  status,
  required,
}: AssertMeasuresHandledRequest): Promise<void> => {
  if (status !== CLOSED_SUPPORT_ERRAND_STATUS || !required) return;

  const measures = await apiService.get<Measure[]>(
    { url: `${errandUrl}/measures`, baseURL, propagateClientError: true, mapUnauthorizedToForbidden: true },
    user,
  );
  // 422 rather than 409: the client reads 409 and 412 on an errand write as "somebody else changed
  // it" and says so. This is not that - the errand is exactly as the handler left it, and the
  // message names what is missing, so it needs a status the client passes through.
  const unhandled = unhandledMeasuresMessage(measures.data ?? []);
  if (unhandled) throw new HttpException(422, unhandled);
};
