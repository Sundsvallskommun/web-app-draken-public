import { expect, test, vi } from 'vitest';

vi.mock('@common/components/file-upload/file-upload.component', () => ({
  imageMimeTypes: [],
  documentMimeTypes: [],
}));

import { mockEnv } from '../../tests/mock-env';
import { SupportStakeholderFormModel } from './support-errand-service';
import {
  engagementIsMarked,
  existsOnlyAsPbi,
  hyphenatedIdentity,
  isPbi,
  newPbiContact,
  pbiCandidates,
  pbiOf,
  pbiPeople,
  pbiProblem,
  pbiProblemAmong,
  pbiRoles,
  sameIdentity,
  stakeholderForEngagement,
  withAssessment,
  withKnowledgeTest,
  withoutPbi,
  withPbi,
} from './support-pbi-service';

const robotNumber = mockEnv.mockPersonNumber;
const androidNumber = mockEnv.mockSecondaryPersonNumber;
const otherNumber = mockEnv.mockTertiaryPersonNumber;

const stakeholder = (overrides: Partial<SupportStakeholderFormModel>): SupportStakeholderFormModel =>
  ({
    internalId: 'i1',
    externalId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
    externalIdType: 'PRIVATE',
    role: 'CONTACT',
    firstName: 'Edwin',
    lastName: 'Molina',
    personNumber: robotNumber,
    emails: [],
    phoneNumbers: [],
    parameters: [],
    ...overrides,
  } as never);

const keysOf = (s: { parameters?: { key: string }[] }) => (s.parameters ?? []).map((p) => p.key);

const edwin = {
  name: 'Edwin Molina',
  identity: { type: 'PERSONNUMMER', code: hyphenatedIdentity(robotNumber) },
  relations: [{ description: 'VD' }],
};
const sara = {
  name: 'Sara Lind',
  identity: { type: 'PERSONNUMMER', code: androidNumber },
  relations: [{ description: 'Styrelseledamot' }],
};

test('an identity matches across the formats Citizen and LegalEntity write it in', () => {
  expect(sameIdentity(robotNumber, hyphenatedIdentity(robotNumber))).toBe(true);
  expect(sameIdentity(robotNumber.slice(2), robotNumber)).toBe(true);
  expect(sameIdentity(robotNumber, androidNumber)).toBe(false);
  expect(sameIdentity(Number(robotNumber), hyphenatedIdentity(robotNumber))).toBe(true);
  expect(sameIdentity(undefined, robotNumber)).toBe(false);
  expect(sameIdentity('', '')).toBe(false);
});

test('an engagement is marked when a stakeholder with the same identity carries the PBI parameter', () => {
  const marked = withPbi(stakeholder({}), { source: 'COMPANY' });
  expect(engagementIsMarked(edwin, [marked])).toBe(true);
  expect(engagementIsMarked(edwin, [stakeholder({})])).toBe(false);
  expect(engagementIsMarked(sara, [marked])).toBe(false);
  expect(stakeholderForEngagement(edwin, [marked])).toBe(marked);
});

test('marking keeps every parameter the form owns and adds the source and the typed role', () => {
  const titled = stakeholder({ parameters: [{ key: 'title', values: ['VD'] }] });
  const marked = withPbi(titled, { source: 'MANUAL', role: '  Finansiär ' });

  expect(marked.parameters).toEqual([
    { key: 'title', values: ['VD'] },
    { key: 'PBI', values: ['true'] },
    { key: 'PBI_SOURCE', values: ['MANUAL'] },
    { key: 'PBI_ROLE', values: ['Finansiär'] },
  ]);
  expect(isPbi(marked)).toBe(true);
  expect(existsOnlyAsPbi(marked)).toBe(true);
  expect(existsOnlyAsPbi(withPbi(titled, {}))).toBe(false);
});

test('a verdict is written beside the marking and leaves source and role alone', () => {
  const marked = withPbi(stakeholder({}), { source: 'MANUAL', role: 'Finansiär' });
  const assessed = withAssessment(marked, { assessment: 'DEFICIENCY', comment: ' Skuld hos Kronofogden. ' });

  expect(keysOf(assessed)).toEqual(['PBI', 'PBI_SOURCE', 'PBI_ROLE', 'PBI_ASSESSMENT', 'PBI_ASSESSMENT_COMMENT']);
  expect(pbiOf(assessed)).toEqual({
    source: 'MANUAL',
    role: 'Finansiär',
    assessment: 'DEFICIENCY',
    comment: 'Skuld hos Kronofogden.',
    knowledgeTest: { status: '', testedAt: '', comment: '' },
  });
  expect(keysOf(withAssessment(assessed, { assessment: 'APPROVED', comment: '   ' }))).toEqual([
    'PBI',
    'PBI_SOURCE',
    'PBI_ROLE',
    'PBI_ASSESSMENT',
  ]);
});

test('the knowledge test is written beside the verdict, and each examination leaves the other alone', () => {
  const assessed = withAssessment(withPbi(stakeholder({}), { source: 'COMPANY' }), { assessment: 'APPROVED', comment: '' });
  const tested = withKnowledgeTest(assessed, { status: 'BOOKED', testedAt: ' 2026-11-01 ', comment: '   ' });

  expect(keysOf(tested)).toEqual(['PBI', 'PBI_SOURCE', 'PBI_ASSESSMENT', 'PBI_KNOWLEDGE_TEST', 'PBI_KNOWLEDGE_TEST_DATE']);
  expect(pbiOf(tested).knowledgeTest).toEqual({ status: 'BOOKED', testedAt: '2026-11-01', comment: '' });
  expect(pbiOf(withAssessment(tested, { assessment: 'DEFICIENCY', comment: 'Skuld.' })).knowledgeTest.status).toBe(
    'BOOKED'
  );
  expect(keysOf(withKnowledgeTest(tested, { status: '', testedAt: '2026-11-01', comment: 'Omprov.' }))).toEqual([
    'PBI',
    'PBI_SOURCE',
    'PBI_ASSESSMENT',
    'PBI_KNOWLEDGE_TEST_DATE',
    'PBI_KNOWLEDGE_TEST_COMMENT',
  ]);
  expect(withoutPbi(tested).parameters).toEqual([]);
});

test('unmarking removes every PBI parameter and nothing else', () => {
  const assessed = withAssessment(
    withPbi(stakeholder({ parameters: [{ key: 'title', values: ['VD'] }] }), { source: 'COMPANY' }),
    { assessment: 'APPROVED', comment: 'Inget.' }
  );
  expect(withoutPbi(assessed).parameters).toEqual([{ key: 'title', values: ['VD'] }]);
});

test('a comment without a verdict is the one thing a marked person may not carry', () => {
  const marked = withPbi(stakeholder({}), { source: 'COMPANY' });
  expect(pbiProblem(marked)).toBeUndefined();
  expect(pbiProblem(withAssessment(marked, { assessment: '', comment: 'Skuld.' }))).toBe(
    'common:personal_suitability.validation.assessment_required'
  );
  expect(pbiProblem(withAssessment(marked, { assessment: 'PENDING', comment: '' }))).toBeUndefined();
  expect(pbiProblem(stakeholder({ parameters: [{ key: 'PBI_ASSESSMENT_COMMENT', values: ['x'] }] }))).toBeUndefined();
  expect(pbiProblemAmong([marked, withAssessment(marked, { assessment: '', comment: 'Skuld.' })])).toBeDefined();
  expect(pbiProblemAmong(undefined)).toBeUndefined();
});

test('the table reads marks off the stakeholders, and the people are the applicant first then the contacts', () => {
  const applicant = withPbi(stakeholder({ internalId: 'c', role: 'PRIMARY', personNumber: androidNumber }), {});
  const contact = withPbi(stakeholder({ internalId: 'a' }), { source: 'COMPANY' });
  const unmarked = stakeholder({ internalId: 'b', personNumber: otherNumber });

  expect(pbiCandidates([edwin, sara], [applicant, contact, unmarked])).toEqual([
    { engagement: edwin, marked: true, stakeholder: contact },
    { engagement: sara, marked: true, stakeholder: applicant },
  ]);
  expect(pbiPeople([applicant], [unmarked, contact]).map((p) => p.internalId)).toEqual(['c', 'a']);
});

test('the role line comes from the company data when it names the person, otherwise from what was typed', () => {
  const fromCompany = withPbi(stakeholder({}), { source: 'COMPANY' });
  const byHand = withPbi(stakeholder({ personNumber: otherNumber }), { source: 'MANUAL', role: 'Finansiär' });
  expect(pbiRoles(fromCompany, [edwin, sara])).toBe('VD');
  expect(pbiRoles(byHand, [edwin, sara])).toBe('Finansiär');
  expect(pbiRoles(byHand, [])).toBe('Finansiär');
});

test('a contact added for the marking is a private person with the party id, never the personal number as id', () => {
  const contact = newPbiContact(
    {
      partyId: 'f4c7a1e2-5b38-4a90-8c2d-1e9f3b7a6c50',
      firstName: 'Sara',
      lastName: 'Lind',
      personNumber: androidNumber,
      role: 'Finansiär',
    },
    'MANUAL'
  );
  expect(contact).toMatchObject({
    role: 'CONTACT',
    externalIdType: 'PRIVATE',
    externalId: 'f4c7a1e2-5b38-4a90-8c2d-1e9f3b7a6c50',
    firstName: 'Sara',
    lastName: 'Lind',
    personNumber: androidNumber,
  });
  expect(contact.internalId).toMatch(/^[0-9a-f-]{36}$/);
  expect(keysOf(contact)).toEqual(['PBI', 'PBI_SOURCE', 'PBI_ROLE']);
});
