import assert from 'node:assert/strict';

import { test } from 'vitest';

import { getStakeholderEmailOptions } from './support-stakeholder-service';

test('SupportManagement recipients include both persisted email spellings and current metadata role labels', () => {
  const stakeholders = [
    {
      role: 'PRIMARY',
      contactChannels: [
        { type: 'EMAIL', value: 'anna@example.test' },
        { type: 'Email', value: 'work@example.test' },
        { type: 'PHONE', value: '0701234567' },
      ],
    },
    { role: 'UNKNOWN', contactChannels: [{ type: 'EMAIL', value: 'other@example.test' }] },
    { role: 'REPORTER' },
  ];
  assert.deepEqual(getStakeholderEmailOptions(stakeholders, [{ name: 'PRIMARY', displayName: 'Ärendeägare' }]), [
    { email: 'anna@example.test', role: 'Ärendeägare' },
    { email: 'work@example.test', role: 'Ärendeägare' },
    { email: 'other@example.test', role: '' },
  ]);
  assert.equal(
    getStakeholderEmailOptions(stakeholders, [{ name: 'PRIMARY', displayName: 'Ny rollbenämning' }])[0].role,
    'Ny rollbenämning'
  );
  assert.deepEqual(getStakeholderEmailOptions(), []);
});
