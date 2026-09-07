import assert from 'node:assert/strict';

import { Role } from '@casedata/interfaces/role';
import { test, vi } from 'vitest';

test('CaseData recipients retain every address and the first stakeholder role label', async () => {
  vi.stubEnv('NEXT_PUBLIC_MUNICIPALITY_ID', '2281');
  try {
    const { getStakeholderEmailOptions } = await import('./casedata-stakeholder-service');
    assert.deepEqual(
      getStakeholderEmailOptions([
        { roles: [Role.APPLICANT], emails: [{ value: 'anna@example.test' }, { value: 'work@example.test' }] },
        { roles: [Role.ASSOCIATION_REPRESENTATIVE], emails: [{ value: 'board@example.test' }] },
        { roles: [], emails: [] },
      ]),
      [
        { email: 'anna@example.test', role: 'Ärendeägare' },
        { email: 'work@example.test', role: 'Ärendeägare' },
        { email: 'board@example.test', role: '' },
      ]
    );
    assert.deepEqual(getStakeholderEmailOptions(), []);
  } finally {
    vi.unstubAllEnvs();
  }
});
