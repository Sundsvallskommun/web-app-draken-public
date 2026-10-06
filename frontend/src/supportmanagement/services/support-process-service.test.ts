import type { ErrandProcess, Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { expect, test } from 'vitest';

import type { SupportMetadata } from './support-metadata-service';
import {
  awaitedGateOfStep,
  hasVisitedSupportProcessStep,
  supportProcessActivityKey,
  supportProcessName,
  supportProcessPhaseKey,
  supportProcessShownStepIndex,
  SupportProcessStep,
  supportProcessStepIndex,
  supportProcessStepName,
} from './support-process-service';

const label = (displayName: string, processKey?: string, labels: Label[] = []): Label => ({
  classification: 'CATEGORY',
  resourceName: displayName.toUpperCase(),
  displayName,
  labels,
  attributes: processKey ? [{ key: 'processKey', value: processKey }] : undefined,
});

const metadataWith = (labelStructure: Label[]) => ({ labels: { labelStructure } } as SupportMetadata);

test('a phase is named after the step it is', () => {
  expect(supportProcessActivityKey('investigation_phase')).toBe('common:process.steps.investigation');
});

test('a step the process runs by itself is named after what the process is doing', () => {
  expect(supportProcessActivityKey('external_task_create_asset')).toBe('common:process.activities.create_asset');
  expect(supportProcessActivityKey('external_task_complete_process')).toBe(
    'common:process.activities.complete_process'
  );
});

test('an activity the model has added since is left unnamed rather than shown as its identifier', () => {
  expect(supportProcessActivityKey('external_task_notify_police')).toBeUndefined();
  expect(supportProcessActivityKey(undefined)).toBeUndefined();
});

test('the process is named after the errand type that starts it', () => {
  const metadata = metadataWith([
    label('Etikett-rot', undefined, [label('Alkohol', undefined, [label('Serveringstillstånd', 'alcohol-serving')])]),
  ]);

  expect(supportProcessName('alcohol-serving', metadata)).toBe('Serveringstillstånd');
});

test('errand types sharing a process are named by the one they hang under, not by a variant', () => {
  const metadata = metadataWith([
    label('Alkohol', undefined, [
      label('Serveringstillstånd', 'alcohol-serving', [
        label('Stadigvarande servering', 'alcohol-serving'),
        label('Provsmakning', 'alcohol-serving'),
      ]),
    ]),
  ]);

  expect(supportProcessName('alcohol-serving', metadata)).toBe('Serveringstillstånd');
});

test('a process no errand type starts has no name, and neither has one without metadata', () => {
  const metadata = metadataWith([label('Alkohol', undefined, [label('Serveringstillstånd', 'alcohol-serving')])]);

  expect(supportProcessName('supervision', metadata)).toBe('');
  expect(supportProcessName('alcohol-serving', undefined)).toBe('');
  expect(supportProcessName(undefined, metadata)).toBe('');
});

const standingIn = (currentActivityId: string, processStatus = 'WAITING') =>
  ({ currentActivityId, processStatus } as ErrandProcess);

test('the phase of a process is the step it stands in', () => {
  expect(supportProcessPhaseKey(standingIn('review_phase'))).toBe('common:process.steps.review');
});

test('a step the process runs by itself is shown as the phase it runs in, not as itself', () => {
  expect(supportProcessPhaseKey(standingIn('external_task_create_decision'))).toBe('common:process.steps.decision');
  expect(supportProcessPhaseKey(standingIn('external_task_check_decision'))).toBe('common:process.steps.decision');
  expect(supportProcessPhaseKey(standingIn('external_task_create_asset'))).toBe('common:process.steps.decision');
  expect(supportProcessPhaseKey(standingIn('external_task_complete_process'))).toBe('common:process.steps.closing');
});

test('a cancellation belongs to no phase, and neither does an activity added to the model since', () => {
  expect(supportProcessPhaseKey(standingIn('external_task_cancel_process'))).toBeUndefined();
  expect(supportProcessPhaseKey(standingIn('external_task_notify_police'))).toBeUndefined();
  expect(supportProcessPhaseKey(undefined)).toBeUndefined();
});

test('a finished process is in the last phase, whichever activity it ended on', () => {
  expect(supportProcessPhaseKey(standingIn('external_task_complete_process', 'COMPLETED'))).toBe(
    'common:process.steps.closing'
  );
});

const processAt = (currentActivityId: string, awaitingSignals: string[] = []): ErrandProcess =>
  ({
    processStatus: 'WAITING',
    currentActivityId,
    awaitingSignals: awaitingSignals.map((name) => ({ name })),
  } as ErrandProcess);

test('the activity that tells the applicant the handling has started is named', () => {
  expect(supportProcessActivityKey('external_task_notify_processing_started')).toBe(
    'common:process.activities.notify_processing_started'
  );
});

test('a step the process runs by itself stands in the phase it is taking the errand to', () => {
  expect(supportProcessPhaseKey(processAt('external_task_notify_processing_started'))).toBe(
    'common:process.steps.review'
  );
  expect(supportProcessPhaseKey(processAt('external_task_check_decision'))).toBe('common:process.steps.decision');
  expect(supportProcessPhaseKey(processAt('external_task_complete_process'))).toBe('common:process.steps.closing');
});

test('the indicator stays put while the process runs a step of its own', () => {
  const working = processAt('external_task_notify_processing_started');

  expect(supportProcessShownStepIndex(working)).toBe(supportProcessShownStepIndex(processAt('review_phase')));
  expect(supportProcessShownStepIndex(processAt('investigation_phase'))).toBe(
    supportProcessStepIndex(processAt('investigation_phase'))
  );
});

test('a step the process runs by itself is not a step the handler stands in', () => {
  const creatingTheDecision = processAt('external_task_create_decision');

  expect(supportProcessStepName(creatingTheDecision)).toBeUndefined();
  expect(supportProcessStepIndex(creatingTheDecision)).toBe(-1);
  expect(hasVisitedSupportProcessStep(SupportProcessStep.DECISION, creatingTheDecision, [])).toBe(false);
  expect(hasVisitedSupportProcessStep(SupportProcessStep.INVESTIGATION, creatingTheDecision, [])).toBe(false);
});

test('the decision phase itself is a step the handler stands in', () => {
  const standingThere = processAt('decision_phase', ['decision_completed']);

  expect(supportProcessStepName(standingThere)).toBe(SupportProcessStep.DECISION);
  expect(hasVisitedSupportProcessStep(SupportProcessStep.DECISION, standingThere, [])).toBe(true);
});

test('an activity the mapping does not know leaves the step unnamed rather than guessed', () => {
  expect(supportProcessStepIndex(processAt('external_task_notify_police'))).toBe(-1);
  expect(supportProcessShownStepIndex(processAt('external_task_notify_police'))).toBe(-1);
  expect(supportProcessStepName(processAt('external_task_notify_police'))).toBeUndefined();
  expect(supportProcessPhaseKey(processAt('external_task_notify_police'))).toBeUndefined();
});

test('a phase offers the gate that leaves it, and never the one that ends the process', () => {
  const offered = awaitedGateOfStep(
    processAt('investigation_phase', ['investigation_completed', 'process_cancelled']),
    SupportProcessStep.INVESTIGATION
  );

  expect(offered?.name).toBe('investigation_completed');
});

test('the decision phase offers nothing to send until a decision is there', () => {
  const beforeTheDecision = processAt('decision_phase', ['process_cancelled']);
  const afterTheDecision = processAt('decision_phase', ['decision_completed', 'process_cancelled']);

  expect(awaitedGateOfStep(beforeTheDecision, SupportProcessStep.DECISION)).toBeUndefined();
  expect(awaitedGateOfStep(afterTheDecision, SupportProcessStep.DECISION)?.name).toBe('decision_completed');
});
