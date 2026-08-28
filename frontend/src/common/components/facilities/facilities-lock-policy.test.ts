import assert from 'node:assert/strict';

import { test } from 'vitest';

import { resolveFacilitiesEditingLock } from './facilities-lock-policy';

test('uses the Support Management lock for every Support Management application', () => {
  let caseDataReads = 0;
  const locked = resolveFacilitiesEditingLock('support-management', {
    supportManagement: () => true,
    caseData: () => {
      caseDataReads += 1;
      return false;
    },
  });

  assert.equal(locked, true);
  assert.equal(caseDataReads, 0);
});

test('keeps the CaseData lock owner for CaseData applications', () => {
  let supportManagementReads = 0;
  const locked = resolveFacilitiesEditingLock('case-data', {
    supportManagement: () => {
      supportManagementReads += 1;
      return false;
    },
    caseData: () => true,
  });

  assert.equal(locked, true);
  assert.equal(supportManagementReads, 0);
});
