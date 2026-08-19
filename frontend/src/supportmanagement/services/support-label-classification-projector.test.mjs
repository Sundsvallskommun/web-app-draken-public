import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectErrandTypeLabel,
  projectLabelCategory,
  projectMappedLabelSubType,
  shouldProjectMappedLabelSubType,
} from './support-label-classification-projector.ts';

const futureLabelTree = {
  root: { resource: 'INCIDENTS', classification: 'INCIDENT_ROOT' },
  ownerClassification: 'ACT_BRANCH',
  categoryClassification: 'INCIDENT_CLASS',
  typeClassification: 'INCIDENT_DETAIL',
};

const category = {
  id: 'future-category',
  classification: 'INCIDENT_CLASS',
  resourceName: 'SAFETY',
  resourcePath: 'INCIDENTS/FUTURE_ACT/SAFETY',
  displayName: 'Safety incident',
};
const type = {
  id: 'future-type',
  classification: 'INCIDENT_DETAIL',
  resourceName: 'FALL',
  resourcePath: 'INCIDENTS/FUTURE_ACT/SAFETY/FALL',
  displayName: 'Fall',
};

test('maps a FUTURE reported-misconduct profile from its capability rather than its application name', () => {
  const errand = {
    classification: { category: 'INCIDENTS/FUTURE_ACT', type: category.resourcePath },
    labels: [type],
  };
  const metadata = {
    labels: {
      labelStructure: [
        {
          classification: 'INCIDENT_ROOT',
          resourcePath: 'INCIDENTS',
          labels: [{ classification: 'ACT_BRANCH', resourcePath: 'INCIDENTS/FUTURE_ACT', labels: [category] }],
        },
      ],
    },
  };

  assert.equal(projectLabelCategory(errand, metadata, futureLabelTree)?.id, 'future-category');
  assert.equal(projectErrandTypeLabel(errand, metadata, futureLabelTree)?.id, 'future-category');
  assert.equal(projectMappedLabelSubType(errand, futureLabelTree)?.id, 'future-type');
  assert.equal(shouldProjectMappedLabelSubType(false, futureLabelTree), true);
});

test('preserves legacy TYPE/SUBTYPE projection when no classification capability exists', () => {
  const legacyType = { id: 'legacy-type', classification: 'TYPE', resourcePath: 'SERVICE/TYPE' };
  const legacySubType = { id: 'legacy-subtype', classification: 'SUBTYPE', resourcePath: 'SERVICE/TYPE/SUBTYPE' };
  const errand = {
    classification: { category: 'SERVICE', type: 'SERVICE/TYPE' },
    labels: [legacyType, legacySubType],
  };

  assert.equal(projectErrandTypeLabel(errand, undefined, undefined)?.id, 'legacy-type');
  assert.equal(projectMappedLabelSubType(errand, undefined)?.id, 'legacy-subtype');
  assert.equal(shouldProjectMappedLabelSubType(false, undefined), false);
  assert.equal(shouldProjectMappedLabelSubType(true, undefined), true);
});
