import assert from 'node:assert/strict';

import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { test } from 'vitest';

import type { InvestigationProfile } from '../../investigation-profile';
import { ACCESS_LEX_LABEL_PATH } from './avvikelse-access-labels';
import { requiresLexAssignment } from './avvikelse-assignment-policy';

const profile = {
  documents: [{ key: 'manager-document', schemaName: 'utredning-enhetschef' }],
} as unknown as InvestigationProfile;

const errand = (suspectedMisconduct: string | undefined, labels: SupportErrand['labels'] = []) =>
  ({
    labels,
    jsonParameters:
      suspectedMisconduct === undefined ? [] : [{ key: 'manager-document', value: { suspectedMisconduct } }],
  } as unknown as SupportErrand);

test('a saved suspected misconduct that has not gone to LEX must be handed over before the decision', () => {
  assert.equal(requiresLexAssignment({ errand: errand('yes'), profile, labelStructure: [] }), true);
});

test('nothing is required without a saved assessment of suspected misconduct', () => {
  assert.equal(requiresLexAssignment({ errand: errand('no'), profile, labelStructure: [] }), false);
  assert.equal(requiresLexAssignment({ errand: errand(undefined), profile, labelStructure: [] }), false);
  assert.equal(requiresLexAssignment({ errand: undefined, profile, labelStructure: [] }), false);
  // Without the unit manager document in the profile there is no assessment to read.
  assert.equal(requiresLexAssignment({ errand: errand('yes'), profile: null, labelStructure: [] }), false);
});

test('an errand already handed to LEX requires nothing more', () => {
  const handedOver = errand('yes', [{ resourcePath: ACCESS_LEX_LABEL_PATH }] as SupportErrand['labels']);
  assert.equal(requiresLexAssignment({ errand: handedOver, profile, labelStructure: [] }), false);
});
