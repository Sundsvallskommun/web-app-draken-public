import { expect, test } from 'vitest';

import { supportSuitabilityPeople, supportSuitabilityProblem } from './support-personal-suitability-service';

const marked = {
  partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
  name: 'Edwin Molina',
  identity: { code: '198501120234' },
  relations: [{ description: 'Verkställande direktör' }],
  marked: true,
};

test('only a marked person is assessed, and the identity is written the way a form is read', () => {
  expect(supportSuitabilityPeople([marked, { ...marked, partyId: 'p2', name: 'Omarkerad', marked: false }])).toEqual([
    {
      partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
      name: 'Edwin Molina',
      identityCode: '19850112-0234',
      roles: 'Verkställande direktör',
      assessment: '',
      comment: '',
    },
  ]);
});

test('a person without a party id cannot be assessed, since there is nothing to write the verdict on', () => {
  expect(supportSuitabilityPeople([{ ...marked, partyId: undefined }])).toEqual([]);
});

test('a verdict already written is read back onto the person', () => {
  expect(
    supportSuitabilityPeople([{ ...marked, assessment: 'DEFICIENCY', assessmentComment: 'Skuld hos Kronofogden.' }])[0]
  ).toMatchObject({ assessment: 'DEFICIENCY', comment: 'Skuld hos Kronofogden.' });
});

test('every person needs a verdict before the section is done, the comment is optional', () => {
  const people = supportSuitabilityPeople([marked]);

  expect(supportSuitabilityProblem([])).toBe('common:personal_suitability.validation.no_people');
  expect(supportSuitabilityProblem(people)).toBe('common:personal_suitability.validation.assessment_required');
  expect(supportSuitabilityProblem([{ ...people[0], assessment: 'APPROVED' }])).toBeUndefined();
  expect(supportSuitabilityProblem([{ ...people[0], assessment: 'PENDING', comment: '' }])).toBeUndefined();
});
