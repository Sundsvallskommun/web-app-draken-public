import type { Measure } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';

import { isRecord, type JsonObject } from './schema-bound-json.service';

export const measureFollowUpSchemaName = 'measure-follow-up';

/**
 * One document per errand, under a stable key, holding the follow-up of every measure.
 *
 * Support Management grants JSON parameters per key, so the key cannot name the measure: a key per
 * measure could never be granted in AccessMapper ahead of time, and every follow-up read would be
 * refused. The measure is identified inside each follow-up instead.
 */
export const measureFollowUpDefinition = Object.freeze({
  key: 'measure-follow-up',
  schemaName: measureFollowUpSchemaName,
});

/** Immutable answers for one measure. Execution is a separate, recoverable write to the measure resource. */
export interface MeasureFollowUpEntry extends JsonObject {
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

const invalidFollowUps = (): never => {
  throw new HttpException(502, 'Den sparade uppföljningen har ett ogiltigt format.');
};

const isTimestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

function readMeasureFollowUpEntry(value: unknown): MeasureFollowUpEntry {
  if (
    !isRecord(value) ||
    typeof value.measureId !== 'string' ||
    !value.measureId.trim() ||
    typeof value.measureVersion !== 'number' ||
    !Number.isSafeInteger(value.measureVersion) ||
    value.measureVersion < 0 ||
    !isTimestamp(value.executed) ||
    typeof value.desiredEffectAchieved !== 'boolean' ||
    typeof value.followUpDescription !== 'string' ||
    !value.followUpDescription.trim() ||
    value.followUpDescription.length > 4000 ||
    typeof value.recordedBy !== 'string' ||
    !value.recordedBy.trim() ||
    !isTimestamp(value.recordedAt)
  )
    return invalidFollowUps();
  return {
    measureId: value.measureId,
    measureVersion: value.measureVersion,
    executed: value.executed,
    desiredEffectAchieved: value.desiredEffectAchieved,
    followUpDescription: value.followUpDescription,
    recordedBy: value.recordedBy,
    recordedAt: value.recordedAt,
  };
}

/** Every follow-up saved on the errand. A measure followed up twice is a corrupt document, not a choice to make. */
export function readMeasureFollowUps(value: JsonObject): MeasureFollowUpEntry[] {
  if (!Array.isArray(value.followUps)) return invalidFollowUps();
  const entries = value.followUps.map(readMeasureFollowUpEntry);
  if (new Set(entries.map(entry => entry.measureId)).size !== entries.length) return invalidFollowUps();
  return entries;
}

export const findMeasureFollowUp = (entries: readonly MeasureFollowUpEntry[] | undefined, measureId: string): MeasureFollowUpEntry | undefined =>
  entries?.find(entry => entry.measureId === measureId);

export const followUpExecutionIsSaved = (measure: Measure, entry: MeasureFollowUpEntry): boolean =>
  Boolean(measure.executed && Date.parse(measure.executed) === Date.parse(entry.executed));
