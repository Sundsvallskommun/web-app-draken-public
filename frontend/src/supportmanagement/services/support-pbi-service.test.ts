import { expect, test, vi } from 'vitest';

vi.mock('@common/components/file-upload/file-upload.component', () => ({
  imageMimeTypes: [],
  documentMimeTypes: [],
}));

import sv from '../../../public/locales/sv/common.json';
import { mockEnv } from '../../tests/mock-env';
import { SupportStakeholderFormModel } from './support-errand-service';
import {
  emptyKnowledgeTest,
  engagementIsMarked,
  existsOnlyAsPbi,
  hyphenatedIdentity,
  isPbi,
  knowledgeTestTypeChoice,
  knowledgeTestTypeName,
  newPbiContact,
  PBI_KNOWLEDGE_TEST_TYPES,
  pbiCandidates,
  pbiOf,
  pbiPeople,
  pbiProblem,
  pbiProblemAmong,
  pbiRoles,
  sameIdentity,
  stakeholderForEngagement,
  withAssessment,
  withKnowledgeTests,
  withMotivation,
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
  const assessed = withAssessment(marked, { assessment: 'DEFICIENCY', comment: 'Skuld hos Kronofogden.' });

  expect(keysOf(assessed)).toEqual(['PBI', 'PBI_SOURCE', 'PBI_ROLE', 'PBI_ASSESSMENT', 'PBI_ASSESSMENT_COMMENT']);
  expect(pbiOf(assessed)).toEqual({
    source: 'MANUAL',
    role: 'Finansiär',
    motivation: '',
    assessment: 'DEFICIENCY',
    comment: 'Skuld hos Kronofogden.',
    knowledgeTests: [],
  });
  expect(keysOf(withAssessment(assessed, { assessment: 'APPROVED', comment: '   ' }))).toEqual([
    'PBI',
    'PBI_SOURCE',
    'PBI_ROLE',
    'PBI_ASSESSMENT',
  ]);
});

test('the knowledge test is written beside the verdict, and each examination leaves the other alone', () => {
  const assessed = withAssessment(withPbi(stakeholder({}), { source: 'COMPANY' }), {
    assessment: 'APPROVED',
    comment: '',
  });
  const tested = withKnowledgeTests(assessed, [
    { type: 'PERMANENT_PUBLIC', status: 'BOOKED', testedAt: ' 2026-11-01 ', comment: '   ' },
  ]);

  expect(keysOf(tested)).toEqual([
    'PBI',
    'PBI_SOURCE',
    'PBI_ASSESSMENT',
    'PBI_KNOWLEDGE_TESTS',
    'PBI_KNOWLEDGE_TEST_1_TYPE',
    'PBI_KNOWLEDGE_TEST_1_STATUS',
    'PBI_KNOWLEDGE_TEST_1_DATE',
  ]);
  expect(pbiOf(tested).knowledgeTests).toEqual([
    { type: 'PERMANENT_PUBLIC', status: 'BOOKED', testedAt: '2026-11-01', comment: '' },
  ]);
  expect(pbiOf(withAssessment(tested, { assessment: 'DEFICIENCY', comment: 'Skuld.' })).knowledgeTests[0].status).toBe(
    'BOOKED'
  );
  expect(withoutPbi(tested).parameters).toEqual([]);
});

test('a person sits several tests, each one numbered and read back in the order it was taken', () => {
  const marked = withPbi(stakeholder({}), { source: 'COMPANY' });
  const tests = [
    { type: 'PERMANENT_PUBLIC', status: 'FAILED' as const, testedAt: '2026-09-01', comment: 'För få poäng.' },
    { type: 'Prov hos annan myndighet', status: 'APPROVED' as const, testedAt: '2026-11-01', comment: '' },
  ];
  const tested = withKnowledgeTests(marked, tests);

  expect(keysOf(tested)).toEqual([
    'PBI',
    'PBI_SOURCE',
    'PBI_KNOWLEDGE_TESTS',
    'PBI_KNOWLEDGE_TEST_1_TYPE',
    'PBI_KNOWLEDGE_TEST_1_STATUS',
    'PBI_KNOWLEDGE_TEST_1_DATE',
    'PBI_KNOWLEDGE_TEST_1_COMMENT',
    'PBI_KNOWLEDGE_TEST_2_TYPE',
    'PBI_KNOWLEDGE_TEST_2_STATUS',
    'PBI_KNOWLEDGE_TEST_2_DATE',
  ]);
  expect(pbiOf(tested).knowledgeTests).toEqual(tests);

  const withoutTheFirst = withKnowledgeTests(tested, pbiOf(tested).knowledgeTests.slice(1));
  expect(pbiOf(withoutTheFirst).knowledgeTests).toEqual([tests[1]]);
  expect(keysOf(withoutTheFirst)).not.toContain('PBI_KNOWLEDGE_TEST_2_TYPE');
});

test('a test the handler has opened but not filled in is still there, since the number of tests is stored', () => {
  const marked = withPbi(stakeholder({}), { source: 'COMPANY' });
  const opened = withKnowledgeTests(marked, [
    { type: 'TASTING', status: 'APPROVED', testedAt: '2026-11-01', comment: '' },
    emptyKnowledgeTest(),
  ]);

  expect(opened.parameters?.find((parameter) => parameter.key === 'PBI_KNOWLEDGE_TESTS')?.values).toEqual(['2']);
  expect(pbiOf(opened).knowledgeTests).toEqual([
    { type: 'TASTING', status: 'APPROVED', testedAt: '2026-11-01', comment: '' },
    emptyKnowledgeTest(),
  ]);
  expect(keysOf(withKnowledgeTests(marked, []))).toEqual(['PBI', 'PBI_SOURCE']);
});

test('the single test an errand was written with before is read as the first of the tests', () => {
  const asItWasStored = stakeholder({
    parameters: [
      { key: 'PBI', values: ['true'] },
      { key: 'PBI_KNOWLEDGE_TEST', values: ['APPROVED'] },
      { key: 'PBI_KNOWLEDGE_TEST_DATE', values: ['2026-02-03'] },
      { key: 'PBI_KNOWLEDGE_TEST_COMMENT', values: ['Godkänt på första försöket.'] },
    ],
  });

  expect(pbiOf(asItWasStored).knowledgeTests).toEqual([
    { type: '', status: 'APPROVED', testedAt: '2026-02-03', comment: 'Godkänt på första försöket.' },
  ]);
  expect(keysOf(withKnowledgeTests(asItWasStored, pbiOf(asItWasStored).knowledgeTests))).toEqual([
    'PBI',
    'PBI_KNOWLEDGE_TESTS',
    'PBI_KNOWLEDGE_TEST_1_STATUS',
    'PBI_KNOWLEDGE_TEST_1_DATE',
    'PBI_KNOWLEDGE_TEST_1_COMMENT',
  ]);
  expect(pbiOf(stakeholder({ parameters: [{ key: 'PBI', values: ['true'] }] })).knowledgeTests).toEqual([]);
});

test('every test Folkhälsomyndigheten holds is named in Swedish', () => {
  const swedish = (key: string): unknown =>
    key
      .replace(/^common:/, '')
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sv);

  for (const candidate of PBI_KNOWLEDGE_TEST_TYPES) {
    expect(swedish(candidate.translationKey), candidate.type).toBeTypeOf('string');
  }
  expect(PBI_KNOWLEDGE_TEST_TYPES).toHaveLength(7);
});

test('a test outside the list is the one the handler wrote, and one from the list is named from it', () => {
  const translate = (key: string) => `översatt:${key}`;

  expect(knowledgeTestTypeChoice('TASTING')).toBe('TASTING');
  expect(knowledgeTestTypeChoice('Prov hos annan myndighet')).toBe('OTHER');
  expect(knowledgeTestTypeChoice('')).toBe('');
  expect(knowledgeTestTypeName('TASTING', translate)).toBe('översatt:common:knowledge_test.types.tasting');
  expect(knowledgeTestTypeName('Prov hos annan myndighet', translate)).toBe('Prov hos annan myndighet');
});

test('the motivation is written beside the marking, and neither verdict is touched', () => {
  const examined = withKnowledgeTests(
    withAssessment(withPbi(stakeholder({}), { source: 'COMPANY', role: 'Finansiär' }), {
      assessment: 'APPROVED',
      comment: 'Inget.',
    }),
    [{ type: '', status: 'BOOKED', testedAt: '2026-11-01', comment: '' }]
  );
  const motivated = withMotivation(examined, 'Driver verksamheten dagligen. ');

  expect(keysOf(motivated)).toEqual([
    'PBI',
    'PBI_SOURCE',
    'PBI_ROLE',
    'PBI_MOTIVATION',
    'PBI_ASSESSMENT',
    'PBI_ASSESSMENT_COMMENT',
    'PBI_KNOWLEDGE_TESTS',
    'PBI_KNOWLEDGE_TEST_1_STATUS',
    'PBI_KNOWLEDGE_TEST_1_DATE',
  ]);
  expect(pbiOf(motivated)).toMatchObject({
    role: 'Finansiär',
    motivation: 'Driver verksamheten dagligen. ',
    assessment: 'APPROVED',
    comment: 'Inget.',
    knowledgeTests: [{ type: '', status: 'BOOKED', testedAt: '2026-11-01', comment: '' }],
  });
  expect(keysOf(withMotivation(motivated, '   '))).not.toContain('PBI_MOTIVATION');
  expect(withoutPbi(motivated).parameters).toEqual([]);
});

test('unmarking removes every PBI parameter and nothing else', () => {
  const assessed = withAssessment(
    withPbi(stakeholder({ parameters: [{ key: 'title', values: ['VD'] }] }), { source: 'COMPANY' }),
    { assessment: 'APPROVED', comment: 'Inget.' }
  );
  expect(withoutPbi(assessed).parameters).toEqual([{ key: 'title', values: ['VD'] }]);
});

test('a comment is stored as it was typed, since the field reads it back between two keystrokes', () => {
  const marked = withPbi(stakeholder({}), { source: 'COMPANY' });

  const midSentence = withAssessment(marked, { assessment: 'APPROVED', comment: 'Ingen anmärkning ' });
  expect(pbiOf(midSentence).comment).toBe('Ingen anmärkning ');

  const midTest = withKnowledgeTests(marked, [
    { type: 'Prov hos ', status: 'BOOKED', testedAt: '', comment: 'Bokat till ' },
  ]);
  expect(pbiOf(midTest).knowledgeTests[0]).toMatchObject({ type: 'Prov hos ', comment: 'Bokat till ' });

  const blank = withAssessment(marked, { assessment: 'APPROVED', comment: '   ' });
  expect(blank.parameters?.map((parameter) => parameter.key)).not.toContain('PBI_ASSESSMENT_COMMENT');
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
