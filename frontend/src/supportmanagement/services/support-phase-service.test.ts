import assert from 'node:assert/strict';

import { test } from 'vitest';

import { getAvailablePhaseTransitions, getSupportPhases } from './support-phase-service';

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
