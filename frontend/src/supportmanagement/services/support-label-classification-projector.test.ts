import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  findLabelByClassification,
  projectErrandTypeLabel,
  projectLabelCategory,
  projectMappedLabelSubType,
  shouldProjectMappedLabelSubType,
} from './support-label-classification-projector';

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

test('projects an explicit label-tree vocabulary independently of application selection', () => {
  const errand = {
    classification: { category: 'INCIDENTS/FUTURE_ACT', type: category.resourcePath },
    labels: [type],
  };
  const metadata = {
    labels: {
      labelStructure: [
        {
          classification: 'INCIDENT_ROOT',
          resourceName: 'INCIDENTS',
          resourcePath: 'INCIDENTS',
          labels: [
            {
              classification: 'ACT_BRANCH',
              resourceName: 'FUTURE_ACT',
              resourcePath: 'INCIDENTS/FUTURE_ACT',
              labels: [category],
            },
          ],
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
  const legacyType = { id: 'legacy-type', classification: 'TYPE', resourceName: 'TYPE', resourcePath: 'SERVICE/TYPE' };
  const legacySubType = {
    id: 'legacy-subtype',
    classification: 'SUBTYPE',
    resourceName: 'SUBTYPE',
    resourcePath: 'SERVICE/TYPE/SUBTYPE',
  };
  const errand = {
    classification: { category: 'SERVICE', type: 'SERVICE/TYPE' },
    labels: [legacyType, legacySubType],
  };

  assert.equal(projectErrandTypeLabel(errand, undefined, undefined)?.id, 'legacy-type');
  assert.equal(projectMappedLabelSubType(errand, undefined)?.id, 'legacy-subtype');
  assert.equal(shouldProjectMappedLabelSubType(false, undefined), false);
  assert.equal(shouldProjectMappedLabelSubType(true, undefined), true);
});

// SupportManagement returns label classifications lowercase-hyphenated ('report-type'), while the
// profiles, the e2e fixtures and every call site spell them SCREAMING_SNAKE. Only
// normalizeClassification bridges the two, so a lookup that stopped normalizing would silently
// find nothing - and an unclassified errand renders the same as an unmatched one.
test('matches a classification across the casing the API actually returns', () => {
  const reportType = {
    id: '5798ce38-e19e-448e-a78c-87163ec67530',
    classification: 'report-type',
    resourceName: 'ABUSE',
    resourcePath: 'REPORT_TYPE/ABUSE',
    displayName: 'Missförhållande',
  };

  assert.equal(findLabelByClassification([reportType], 'REPORT_TYPE'), reportType);
  assert.equal(findLabelByClassification([reportType], 'report-type'), reportType);
  assert.equal(findLabelByClassification([reportType], 'TYPE'), undefined);
});
