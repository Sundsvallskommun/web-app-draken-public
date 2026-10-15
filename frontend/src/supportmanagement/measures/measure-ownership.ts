import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';

/** Only the user who registered a measure may edit it. The BFF applies the same rule on write. */
export const isOwnMeasure = (measure: Pick<Measure, 'addedByUser'>, username: string | undefined): boolean => {
  const owner = measure.addedByUser?.trim().toLowerCase();
  const current = username?.trim().toLowerCase();
  return Boolean(owner && current && owner === current);
};

/**
 * Whether the user follows up a measure: marks it carried out and says whether it had the effect sought. Where
 * the deployment names handler roles the BFF answers by role - the unit's managers do it, whoever proposed the
 * measure; where it names none, the registrar follows up their own. The BFF applies the same rule on write.
 */
export const mayFollowUpMeasure = (
  measure: Pick<Measure, 'addedByUser'>,
  username: string | undefined,
  mayFollowUpByRole: boolean | undefined
): boolean => mayFollowUpByRole ?? isOwnMeasure(measure, username);
