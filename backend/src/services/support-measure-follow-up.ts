import type { Measure } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';

import type { JsonObject } from './schema-bound-json.service';

export const measureFollowUpSchemaName = 'measure-follow-up';
export const measureFollowUpDefinition = (measureId: string) => ({
  key: `measure-follow-up-${measureId}`,
  schemaName: measureFollowUpSchemaName,
});

/** Immutable answers. Execution is a separate, recoverable write to the measure resource. */
export interface MeasureFollowUpDocument extends JsonObject {
  readonly measureId: string;
  readonly measureVersion: number;
  readonly executed: string;
  readonly desiredEffectAchieved: boolean;
  readonly followUpDescription: string;
  readonly recordedBy: string;
  readonly recordedAt: string;
}

export interface SupportMeasureFollowUp {
  readonly status: 'pending' | 'completed' | 'conflict';
  readonly desiredEffectAchieved: boolean;
  readonly followUpDescription: string;
}

/** Draken's composed read model; these properties are not part of SM's Measure contract. */
export interface SupportMeasure extends Measure {
  readonly followUp?: SupportMeasureFollowUp;
}

export const isPlannedApprovedMeasure = (measure: Measure): boolean =>
  (measure.accept === 'TRUE' || measure.accept === 'REWORK') && Boolean(measure.plannedStart || measure.plannedComplete);

export function readMeasureFollowUp(value: JsonObject, measureId: string): MeasureFollowUpDocument {
  if (
    value.measureId !== measureId ||
    typeof value.measureVersion !== 'number' ||
    !Number.isSafeInteger(value.measureVersion) ||
    value.measureVersion < 0 ||
    typeof value.executed !== 'string' ||
    !Number.isFinite(Date.parse(value.executed)) ||
    typeof value.desiredEffectAchieved !== 'boolean' ||
    typeof value.followUpDescription !== 'string' ||
    !value.followUpDescription.trim() ||
    value.followUpDescription.length > 4000 ||
    typeof value.recordedBy !== 'string' ||
    !value.recordedBy.trim() ||
    typeof value.recordedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.recordedAt))
  )
    throw new HttpException(502, 'Den sparade uppföljningen har ett ogiltigt format.');
  return {
    measureId,
    measureVersion: value.measureVersion,
    executed: value.executed,
    desiredEffectAchieved: value.desiredEffectAchieved,
    followUpDescription: value.followUpDescription,
    recordedBy: value.recordedBy,
    recordedAt: value.recordedAt,
  };
}

export const followUpExecutionIsSaved = (measure: Measure, document: MeasureFollowUpDocument): boolean =>
  Boolean(measure.executed && Date.parse(measure.executed) === Date.parse(document.executed));
