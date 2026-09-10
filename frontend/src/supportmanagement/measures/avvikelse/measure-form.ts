import type { Measure, Role } from '@common/data-contracts/supportmanagement/data-contracts';
import dayjs from 'dayjs';

import { measureContentIsLocked, measureIsApproved } from '../measure-decision';
import type { MeasureChanges, NewMeasure } from '../support-measure-service';

export interface MeasureForm {
  measureTypeId: string;
  addedByRole: string;
  timing: '' | 'planned' | 'executed';
  responsibleUser: string;
  goal: string;
  description: string;
  plannedStart: string;
  plannedComplete: string;
  executed: string;
}

export const measureFormValues = (measure?: Measure, creationRoles: readonly Role[] = []): MeasureForm => ({
  measureTypeId: measure?.measureTypeId ?? '',
  addedByRole: measure ? measure.addedByRole ?? '' : creationRoles.length === 1 ? creationRoles[0].name : '',
  timing: measure?.executed ? 'executed' : measure?.plannedStart || measure?.plannedComplete ? 'planned' : '',
  responsibleUser: measure?.responsibleUser ?? '',
  goal: measure?.goal ?? '',
  description: measure?.description ?? '',
  plannedStart: measure?.plannedStart ? dayjs(measure.plannedStart).format('YYYY-MM-DD') : '',
  plannedComplete: measure?.plannedComplete ? dayjs(measure.plannedComplete).format('YYYY-MM-DD') : '',
  executed: measure?.executed ? dayjs(measure.executed).format('YYYY-MM-DD') : '',
});

export type MeasureFormErrors = Partial<Record<keyof MeasureForm, string>>;

export type MeasureDateField = 'plannedStart' | 'plannedComplete' | 'executed';

/** The same timing choice controls both visible fields and the dates sent to the API. */
export function measureDateFields(timing: MeasureForm['timing']): readonly MeasureDateField[] {
  switch (timing) {
    case 'planned':
      return ['plannedStart', 'plannedComplete'];
    case 'executed':
      return ['executed'];
    default:
      return [];
  }
}

export interface MeasureFormPolicy {
  /** Only a deciding role, or an already accepted measure, may be reported as executed. */
  canExecute: boolean;
  /** Today as YYYY-MM-DD; an executed date may not lie after it. Injectable for tests. */
  today?: string;
}

export const todayIsoDate = (): string => dayjs().format('YYYY-MM-DD');

/** Executed measures are facts, not proposals, so proposing roles can only register planned ones. */
export function measureCanExecute(existing: Measure | undefined, roleDecides: boolean): boolean {
  return existing ? measureIsApproved(existing) || Boolean(existing.executed) : roleDecides;
}

export function measureFormErrors(
  values: MeasureForm,
  existing?: Measure,
  policy: MeasureFormPolicy = { canExecute: true }
): MeasureFormErrors {
  const errors: MeasureFormErrors = {};
  if (!values.measureTypeId) errors.measureTypeId = 'Välj typ av åtgärd.';
  if (!existing && !values.addedByRole) errors.addedByRole = 'Välj vilken roll åtgärden registreras för.';
  if (!values.description.trim()) errors.description = 'Beskriv vad åtgärden innebär.';
  if (!values.goal.trim()) errors.goal = 'Beskriv vad åtgärden ska uppnå.';
  switch (values.timing) {
    case 'planned':
      if (existing?.executed) errors.timing = 'En genomförd åtgärd kan inte återställas till planerad.';
      if (!values.plannedStart) errors.plannedStart = 'Ange när åtgärden ska påbörjas.';
      if (!values.plannedComplete) errors.plannedComplete = 'Ange när åtgärden ska vara klar.';
      if (values.plannedStart && values.plannedComplete && values.plannedComplete < values.plannedStart) {
        errors.plannedComplete = 'Slutdatum får inte vara före startdatum.';
      }
      break;
    case 'executed':
      if (!policy.canExecute) errors.timing = 'Förslag kan bara registreras som planerade åtgärder.';
      if (!values.executed) errors.executed = 'Ange när åtgärden genomfördes.';
      else if (values.executed > (policy.today ?? todayIsoDate())) {
        errors.executed = 'Genomfört datum kan inte ligga i framtiden.';
      }
      break;
    default:
      errors.timing = 'Välj om åtgärden är genomförd eller planerad.';
  }
  return errors;
}

/** Send only edited basic fields, preserving audit/decision fields and exact timestamps on untouched dates. */
export function measureFormChanges(values: MeasureForm, existing: Measure): MeasureChanges {
  const initial = measureFormValues(existing);
  const changes: MeasureChanges = {};
  for (const key of ['measureTypeId', 'responsibleUser', 'goal', 'description'] as const) {
    if (key !== 'responsibleUser' && measureContentIsLocked(existing)) continue;
    // Responsible is free text, so surrounding whitespace is not a change worth sending.
    const value = key === 'responsibleUser' ? values[key].trim() : values[key];
    if (value !== initial[key]) changes[key] = value;
  }
  for (const key of measureDateFields(values.timing)) {
    if (values[key] && values[key] !== initial[key]) changes[key] = dayjs(values[key]).format('YYYY-MM-DDTHH:mm:ssZ');
  }
  return changes;
}

export function measureFormCreate(values: MeasureForm): NewMeasure {
  return {
    ...measureFormChanges(values, {}),
    measureTypeId: values.measureTypeId,
    addedByRole: values.addedByRole,
    goal: values.goal,
    description: values.description,
  };
}
