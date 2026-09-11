import assert from 'node:assert/strict';

import type { Phase } from '@common/data-contracts/supportmanagement/data-contracts';
import { test } from 'vitest';

import { hasReachedInvestigationPhase } from './investigation-phase';

const metadataPhases: Phase[] = [
  { id: 'received', name: 'RECEIVED', displayName: 'Inkommet', phaseOrder: 1 },
  { id: 'investigation', name: 'UTREDNING', displayName: 'Utredning', phaseOrder: 2 },
  { id: 'decision', name: 'BESLUT', displayName: 'Beslut', phaseOrder: 3 },
  { id: 'closed', name: 'CLOSED', displayName: 'Avslutat', phaseOrder: 4 },
];

/** The readable side of the errand: the phase it has entered and not left is the one it is in. */
const inPhase = (phaseId: string) => ({ metadataPhases, errandPhases: [{ phaseId }] });

test('the phase being waited for counts as reached, and so does every later one', () => {
  assert.equal(hasReachedInvestigationPhase('Utredning', inPhase('received')), false);
  assert.equal(hasReachedInvestigationPhase('Utredning', inPhase('investigation')), true);
  assert.equal(hasReachedInvestigationPhase('Utredning', inPhase('decision')), true);
  assert.equal(hasReachedInvestigationPhase('Utredning', inPhase('closed')), true);
});

test('the decision phase is reached later than the investigation phase', () => {
  assert.equal(hasReachedInvestigationPhase('Beslut', inPhase('investigation')), false);
  assert.equal(hasReachedInvestigationPhase('Beslut', inPhase('decision')), true);
});

// The namespace names its phases; Draken reads the model rather than prescribing a spelling.
test('the phase resolves from either the technical name or the name handlers read', () => {
  assert.equal(hasReachedInvestigationPhase('UTREDNING', inPhase('investigation')), true);
  assert.equal(hasReachedInvestigationPhase('  utredning  ', inPhase('investigation')), true);
});

// An errand created outside the workflow has entered no phase at all, so it is before every one of
// them - the tab that waits for a phase stays away until somebody starts the flow.
test('an errand that has not entered the workflow has reached no phase', () => {
  assert.equal(hasReachedInvestigationPhase('Utredning', { metadataPhases, errandPhases: undefined }), false);
  assert.equal(hasReachedInvestigationPhase('Utredning', { metadataPhases, errandPhases: [] }), false);
  assert.equal(
    hasReachedInvestigationPhase('Utredning', { metadataPhases, errandPhases: [{ phaseId: 'received', ended: '1' }] }),
    false
  );
});

// Configuration nobody made must not take a tab away: a namespace running no workflow, or one whose
// phases are named differently, keeps what it had before the gate existed.
test('a phase the deployment does not run gates nothing', () => {
  assert.equal(hasReachedInvestigationPhase('Utredning', { metadataPhases: undefined, errandPhases: undefined }), true);
  assert.equal(hasReachedInvestigationPhase('Utredning', { metadataPhases: [], errandPhases: undefined }), true);
  assert.equal(hasReachedInvestigationPhase('Handläggning', inPhase('received')), true);
});

test('a variant naming no phase is never gated', () => {
  assert.equal(hasReachedInvestigationPhase(undefined, inPhase('received')), true);
  assert.equal(hasReachedInvestigationPhase('   ', inPhase('received')), true);
});

// A retired phase is not one to wait for, but an errand can still be sitting in one, and its order
// is what places it against the phase being waited for.
test('a deprecated phase still orders the errand it holds', () => {
  const withRetired: Phase[] = [
    ...metadataPhases,
    { id: 'retired-investigation', name: 'UTREDNING GAMMAL', phaseOrder: 2, deprecated: true },
  ];

  assert.equal(
    hasReachedInvestigationPhase('Utredning', {
      metadataPhases: withRetired,
      errandPhases: [{ phaseId: 'retired-investigation' }],
    }),
    true
  );
  assert.equal(
    hasReachedInvestigationPhase('Beslut', {
      metadataPhases: withRetired,
      errandPhases: [{ phaseId: 'retired-investigation' }],
    }),
    false
  );
  // The retired phase cannot be the one a tab waits for, so naming it gates nothing.
  assert.equal(hasReachedInvestigationPhase('UTREDNING GAMMAL', inPhase('received')), true);
});

// The errand is in the workflow but in a phase the model no longer describes: nothing can be
// ordered against it, and a tab is not taken away over metadata that has moved on.
test('a phase missing from the model does not lock the errand out', () => {
  assert.equal(hasReachedInvestigationPhase('Utredning', inPhase('phase-nobody-configured')), true);
});
