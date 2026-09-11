import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  getAvailablePhaseTransitions,
  getSupportPhases,
  isInitialSupportPhase,
  isStatusAllowedInPhase,
  resolveStartProcessPhaseAdvance,
} from './support-phase-service';

const phases = [
  {
    id: 'received',
    name: 'RECEIVED',
    phaseOrder: 1,
    transitions: [
      { id: 'start-investigation', targetPhaseId: 'investigation', description: 'Starta utredning' },
      { id: 'close-directly', targetPhaseId: 'closed', description: 'Avsluta direkt' },
      { id: 'deprecated-transition', targetPhaseId: 'closed', deprecated: true },
    ],
  },
  { id: 'investigation', name: 'INVESTIGATION', phaseOrder: 2 },
  { id: 'closed', name: 'CLOSED', phaseOrder: 3 },
];

test('returns every explicit valid branch without selecting one by metadata order', () => {
  const available = getAvailablePhaseTransitions('received', phases);

  assert.deepEqual(
    available.map(({ transition, target }) => [transition.id, target.id]),
    [
      ['start-investigation', 'investigation'],
      ['close-directly', 'closed'],
    ]
  );
});

test('does not infer an active phase from history or the first metadata phase', () => {
  assert.deepEqual(getAvailablePhaseTransitions(undefined, phases), []);
  assert.deepEqual(getAvailablePhaseTransitions('missing', phases), []);
});

test('filters deprecated phases and orders display phases explicitly', () => {
  assert.deepEqual(
    getSupportPhases([
      { id: 'closed', name: 'CLOSED', phaseOrder: 3 },
      { id: 'retired', name: 'RETIRED', phaseOrder: 2, deprecated: true },
      { id: 'received', name: 'RECEIVED', phaseOrder: 1 },
    ]).map(({ id }) => id),
    ['received', 'closed']
  );
});

// Starting handläggning is the same event as leaving the phase the errand was registered in, so the
// button performs the move - but only where the move is unambiguous.
test('starting handläggning takes the one transition out of the registered phase', () => {
  const singleBranch = [
    {
      id: 'received',
      name: 'Registrerat',
      phaseOrder: 1,
      transitions: [{ id: 'start', targetPhaseId: 'investigation' }],
    },
    { id: 'investigation', name: 'Utredning', phaseOrder: 2 },
  ];

  assert.deepEqual(resolveStartProcessPhaseAdvance('received', singleBranch), {
    kind: 'transition',
    transitionId: 'start',
  });
});

test('starting handläggning enters the workflow for an errand that is in no phase', () => {
  assert.deepEqual(resolveStartProcessPhaseAdvance(undefined, phases), { kind: 'enter' });
});

test('starting handläggning moves no errand it would have to guess for', () => {
  // A deployment running no workflow has no phase to enter.
  assert.equal(resolveStartProcessPhaseAdvance(undefined, []), null);
  // Received branches into investigation and closed; the branch is chosen in the phase strip.
  assert.equal(resolveStartProcessPhaseAdvance('received', phases), null);
  // A phase with nowhere to go stays where it is.
  assert.equal(resolveStartProcessPhaseAdvance('closed', phases), null);
});

// The strip offers no move out of the first phase, because the sidebar's start button owns that step.
test('the registered phase is the first of the ordered model, and nothing else is', () => {
  const ordered = getSupportPhases(phases);

  assert.equal(isInitialSupportPhase('received', ordered), true);
  assert.equal(isInitialSupportPhase('investigation', ordered), false);
  assert.equal(isInitialSupportPhase(undefined, ordered), false);
  assert.equal(isInitialSupportPhase('received', []), false);
});

// Phase and status are one state: Support Management refuses a status the active phase does not
// list, so the errand is never asked to take one it cannot have.
test('a status is available only where the active phase lists it', () => {
  const workflow = [
    { id: 'registered', name: 'Registrerat', phaseOrder: 1, allowedStatuses: ['NEW'] },
    { id: 'review', name: 'Granskning', phaseOrder: 2, allowedStatuses: ['INQUIRY', 'PENDING'] },
    { id: 'unconstrained', name: 'Utredning', phaseOrder: 3 },
  ];

  assert.equal(isStatusAllowedInPhase('INQUIRY', 'registered', workflow), false);
  assert.equal(isStatusAllowedInPhase('INQUIRY', 'review', workflow), true);
  // A phase listing no statuses constrains nothing, and neither does a workflow that is not there.
  assert.equal(isStatusAllowedInPhase('INQUIRY', 'unconstrained', workflow), true);
  assert.equal(isStatusAllowedInPhase('INQUIRY', undefined, []), true);
});
