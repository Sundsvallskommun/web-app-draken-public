import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';

import { measureIsApproved } from './measure-decision';

export interface MeasureFollowUpInput {
  desiredEffectAchieved: boolean;
  followUpDescription: string;
}

export interface SupportMeasure extends Measure {
  followUp?: MeasureFollowUpInput & { status: 'pending' | 'completed' | 'conflict' };
}

/** Completed planned measures remain visible with their result. Directly executed measures do not enter this flow. */
export const measureBelongsInFollowUp = (measure: Measure): boolean =>
  measureIsApproved(measure) && Boolean(measure.plannedStart || measure.plannedComplete);

export const measureHasFollowUp = (measure: SupportMeasure): boolean => measure.followUp?.status === 'completed';

export const measureCanBeFollowedUp = (measure: SupportMeasure): boolean =>
  Boolean(measure.id) &&
  measureBelongsInFollowUp(measure) &&
  (!measure.followUp || measure.followUp.status === 'pending');
