import { expect, test } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import { supportSuitabilityPeople, supportSuitabilityProblem } from './support-personal-suitability-service';

const fromCompanyData = {
  partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
  name: 'Edwin Molina',
  identityCode: mockEnv.mockPersonNumber,
  roles: 'Verkställande direktör',
  addedByHand: false,
};

test('a person taken from the company data carries their role, and the identity is written the way a form is read', () => {
  expect(supportSuitabilityPeople([fromCompanyData])).toEqual([
    {
      partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
      name: 'Edwin Molina',
      identityCode: mockEnv.mockPersonNumberDashed,
      roles: 'Verkställande direktör',
      assessment: '',
      comment: '',
    },
  ]);
});

test('a person a handler entered by hand is assessed like any other, with nothing the company data would have given', () => {
  expect(
    supportSuitabilityPeople([
      {
        partyId: 'f4c7a1e2-5b38-4a90-8c2d-1e9f3b7a6c50',
        name: 'Sara Lind',
        identityCode: '',
        roles: '',
        addedByHand: true,
      },
    ])
  ).toEqual([
    {
      partyId: 'f4c7a1e2-5b38-4a90-8c2d-1e9f3b7a6c50',
      name: 'Sara Lind',
      identityCode: '',
      roles: '',
      assessment: '',
      comment: '',
    },
  ]);
});

test('a verdict already written is read back onto the person', () => {
  expect(
    supportSuitabilityPeople([
      { ...fromCompanyData, assessment: 'DEFICIENCY', assessmentComment: 'Skuld hos Kronofogden.' },
    ])[0]
  ).toMatchObject({ assessment: 'DEFICIENCY', comment: 'Skuld hos Kronofogden.' });
});

test('every person needs a verdict before the section is done, the comment is optional', () => {
  const people = supportSuitabilityPeople([fromCompanyData]);

  expect(supportSuitabilityProblem([])).toBe('common:personal_suitability.validation.no_people');
  expect(supportSuitabilityProblem(people)).toBe('common:personal_suitability.validation.assessment_required');
  expect(supportSuitabilityProblem([{ ...people[0], assessment: 'APPROVED' }])).toBeUndefined();
  expect(supportSuitabilityProblem([{ ...people[0], assessment: 'PENDING', comment: '' }])).toBeUndefined();
});
