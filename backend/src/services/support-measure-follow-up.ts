import type { Measure } from '@/data-contracts/supportmanagement/data-contracts';

/**
 * A follow-up is saved on the measure itself: `result` says whether the measure had the desired effect,
 * `resultText` what happened and `completedAt` when it was followed up. Support Management keeps no
 * catalogue of measure results, so Draken owns the two result values.
 */
const MEASURE_RESULT_ACHIEVED = 'ACHIEVED';
const MEASURE_RESULT_NOT_ACHIEVED = 'NOT_ACHIEVED';

export interface MeasureFollowUpAnswers {
  readonly result: string;
  readonly resultText: string;
}

export const measureFollowUpAnswers = (desiredEffectAchieved: boolean, followUpDescription: string): MeasureFollowUpAnswers => ({
  result: desiredEffectAchieved ? MEASURE_RESULT_ACHIEVED : MEASURE_RESULT_NOT_ACHIEVED,
  resultText: followUpDescription,
});

/** Whether these very answers are what the measure holds - a lost response to an accepted follow-up, not a new one. */
export const measureHoldsFollowUp = (measure: Pick<Measure, 'result' | 'resultText'>, answers: MeasureFollowUpAnswers): boolean =>
  measure.result === answers.result && measure.resultText === answers.resultText;

export const isPlannedApprovedMeasure = (measure: Measure): boolean =>
  (measure.accept === 'TRUE' || measure.accept === 'REWORK') && Boolean(measure.plannedStart || measure.plannedComplete);
