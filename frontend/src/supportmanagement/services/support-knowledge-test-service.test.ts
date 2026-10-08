import { expect, test } from 'vitest';

import { supportKnowledgeTestPeople, supportKnowledgeTestRecord } from './support-knowledge-test-service';

const fromCompanyData = {
  partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
  name: 'Edwin Molina',
  identityCode: '198501120234',
  roles: 'Verkställande direktör',
  addedByHand: false,
};

test('a person with no knowledge test yet is read as an empty card, with the identity written the way a form is read', () => {
  expect(supportKnowledgeTestPeople([fromCompanyData])).toEqual([
    {
      partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
      name: 'Edwin Molina',
      identityCode: '19850112-0234',
      roles: 'Verkställande direktör',
      addedByHand: false,
      status: '',
      testedAt: '',
      comment: '',
    },
  ]);
});

test('a knowledge test already written is read back onto the person', () => {
  expect(
    supportKnowledgeTestPeople([
      {
        ...fromCompanyData,
        knowledgeTest: 'APPROVED',
        knowledgeTestDate: '2026-10-02',
        knowledgeTestComment: 'Provet togs om i september.',
      },
    ])[0]
  ).toMatchObject({ status: 'APPROVED', testedAt: '2026-10-02', comment: 'Provet togs om i september.' });
});

test('a person entered by hand keeps that, so letting go of them says what it will do', () => {
  expect(supportKnowledgeTestPeople([{ ...fromCompanyData, addedByHand: true }])[0].addedByHand).toBe(true);
});

test('the verdict on the person is left alone by the knowledge test, since the two are examined apart', () => {
  const [person] = supportKnowledgeTestPeople([
    { ...fromCompanyData, assessment: 'DEFICIENCY', assessmentComment: 'Skuld hos Kronofogden.' },
  ]);

  expect(Object.keys(person)).not.toContain('assessment');
});

test('a field the handler left empty is left out rather than written blank', () => {
  const [person] = supportKnowledgeTestPeople([fromCompanyData]);

  expect(supportKnowledgeTestRecord({ ...person, status: 'BOOKED', testedAt: '2026-11-01', comment: '   ' })).toEqual({
    status: 'BOOKED',
    testedAt: '2026-11-01',
    comment: undefined,
  });
  expect(supportKnowledgeTestRecord(person)).toEqual({ status: undefined, testedAt: undefined, comment: undefined });
});
