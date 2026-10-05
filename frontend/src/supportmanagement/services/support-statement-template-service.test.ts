import { expect, test } from 'vitest';

import {
  supportReferralPeople,
  SupportReferralPersons,
  supportStatementTemplateParameters,
  supportStatementTemplatePersons,
  supportStatementTemplateProblem,
  supportStatementTemplates,
} from './support-statement-template-service';

const owner = {
  role: 'PRIMARY',
  organizationName: 'Krogen Exempel AB',
  externalId: 'd5727c45-8c19-42a0-a04a-5ef11d108618',
  parameters: [{ key: 'organizationNumber', values: ['556676-3081'] }],
  address: 'Storgatan 1',
  zipCode: '852 30',
  city: 'Sundsvall',
};

const errandOf = (extra: Record<string, unknown> = {}) =>
  ({
    errandNumber: 'AOT-26100008',
    stakeholders: [owner],
    jsonParameters: [{ value: { besoksadressSammaSomForetaget: 'JA' } }],
    ...extra,
  } as never);

const facts = {
  handlerName: 'Anna Andersson',
  handlerEmail: 'anna.andersson@sundsvall.se',
  dueAt: '2026-10-22',
};

const people = [
  {
    partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
    name: 'Erik Exempelsson',
    firstName: 'Erik',
    lastName: 'Exempelsson',
    personalNumber: '19800101-1234',
    roles: 'Styrelseledamot',
    marked: true,
  },
];

const PREMISES = ['premisesName', 'premisesStreet', 'premisesPostalAddress'];

const counterpartyOfTemplate: Record<string, string> = {
  'referral-police': 'Polismyndigheten',
  'referral-general': 'Kronofogden',
  'referral-enforcement-authority': 'Kronofogden',
  'referral-rescue-service': 'Medelpads Räddningstjänstförbund',
  'criminal-record-request': 'Polismyndigheten',
  'tax-agency-request-serving': 'Skatteverket',
  'tax-agency-request-serving-inspection': 'Skatteverket',
  'tax-agency-request-tobacco-company': 'Skatteverket',
  'tax-agency-request-tobacco-pbi': 'Skatteverket',
};

test('an authority with a template of its own is offered it, and the general one as well', () => {
  expect(supportStatementTemplates('Kronofogden').map((template) => template.identifier)).toEqual([
    'referral-enforcement-authority',
    'referral-general',
  ]);
});

test('an authority without one is offered the general template alone', () => {
  expect(supportStatementTemplates('Miljökontoret').map((template) => template.identifier)).toEqual([
    'referral-general',
  ]);
  expect(supportStatementTemplates(undefined).map((template) => template.identifier)).toEqual(['referral-general']);
});

test('the police are asked both for a referral and for a criminal record', () => {
  expect(supportStatementTemplates('Polismyndigheten').map((template) => template.identifier)).toEqual([
    'referral-police',
    'criminal-record-request',
    'referral-general',
  ]);
});

test('the errand decides which of the tax agency forms is on offer', () => {
  const identifiers = (processKey: string | undefined) =>
    supportStatementTemplates('Skatteverket', processKey ? errandOf({ process: { processKey } }) : undefined).map(
      (template) => template.identifier
    );

  expect(identifiers('alcohol-serving')).toEqual(['tax-agency-request-serving', 'referral-general']);
  expect(identifiers('supervision')).toEqual(['tax-agency-request-serving-inspection', 'referral-general']);
  expect(identifiers('tobacco-sales')).toEqual([
    'tax-agency-request-tobacco-company',
    'tax-agency-request-tobacco-pbi',
    'referral-general',
  ]);
});

test('an errand whose process we do not know is offered every tax agency form', () => {
  expect(
    supportStatementTemplates('Skatteverket', errandOf({ process: { processKey: 'tillsyn-av-nagot' } }))
  ).toHaveLength(5);
});

test('a referral to an authority with an address of its own carries it', () => {
  expect(
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'referral-enforcement-authority',
      counterpartyName: 'Kronofogden',
      errand: errandOf(),
    })
  ).toMatchObject({
    caseNumber: 'AOT-26100008',
    recipientName: 'Kronofogden',
    recipientStreet: 'Box 1050',
    recipientPostalAddress: '172 21 Sundbyberg',
    replyDeadline: '2026-10-22',
    premisesStreet: 'Storgatan 1',
    premisesPostalAddress: '852 30 Sundsvall',
    applicantOrgNumber: '556676-3081',
  });
});

test('the police referral lists the people, with their roles, and asks for no deadline', () => {
  const parameters = supportStatementTemplateParameters({
    ...facts,
    identifier: 'referral-police',
    counterpartyName: 'Polismyndigheten',
    errand: errandOf(),
    people,
  });

  expect(parameters.persons).toEqual([
    { personalNumber: '19800101-1234', name: 'Erik Exempelsson', roles: 'Styrelseledamot' },
  ]);
  expect(parameters).not.toHaveProperty('replyDeadline');
});

test('a criminal record is asked for one person at a time, under the authority that asks', () => {
  expect(
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'criminal-record-request',
      counterpartyName: 'Polismyndigheten',
      errand: errandOf(),
      people,
      person: people[0],
    })
  ).toMatchObject({
    requesterCity: 'Sundsvall',
    requesterPostalCode: '851 85',
    handlerEmail: 'anna.andersson@sundsvall.se',
    caseNumber: 'AOT-26100008',
    personalNumber: '19800101-1234',
    firstName: 'Erik',
    lastName: 'Exempelsson',
  });
});

test('the tax agency is told what the errand is about, in the words of its own type', () => {
  expect(
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'tax-agency-request-serving',
      counterpartyName: 'Skatteverket',
      errand: errandOf({
        labels: [{ classification: 'TYPE', displayName: 'Ansökan om serveringstillstånd' }],
      }),
      people,
    })
  ).toMatchObject({
    caseType: 'ansökan om serveringstillstånd',
    applicantName: 'Krogen Exempel AB',
    representatives: [{ personalNumber: '19800101-1234', name: 'Erik Exempelsson' }],
  });
});

test('the inspection form names the permit holder rather than an applicant', () => {
  expect(
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'tax-agency-request-serving-inspection',
      counterpartyName: 'Skatteverket',
      errand: errandOf(),
      people,
    })
  ).toMatchObject({
    permitHolderName: 'Krogen Exempel AB',
    permitHolderOrgNumber: '556676-3081',
  });
});

test('the tobacco form about a person carries that one person', () => {
  expect(
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'tax-agency-request-tobacco-pbi',
      counterpartyName: 'Skatteverket',
      errand: errandOf(),
      people,
      person: people[0],
    })
  ).toMatchObject({
    applicantName: 'Krogen Exempel AB',
    pbiName: 'Erik Exempelsson',
    pbiPersonalNumber: '19800101-1234',
  });
});

test('a template that needs people says so before anything is rendered', () => {
  expect(supportStatementTemplateProblem('', '2026-10-22', [])).toBe('common:statements.validation.template');
  expect(supportStatementTemplateProblem('referral-police', '', [])).toBe('common:statements.validation.people');
  expect(supportStatementTemplateProblem('referral-police', '', people)).toBeUndefined();
  expect(supportStatementTemplateProblem('referral-general', '', [])).toBe('common:statements.validation.due_at');
  expect(supportStatementTemplateProblem('referral-general', '2026-10-22', [])).toBeUndefined();
});

test('a person without a personal number cannot be written into a form that needs one', () => {
  expect(supportStatementTemplateProblem('criminal-record-request', '', [{ ...people[0], personalNumber: '' }])).toBe(
    'common:statements.validation.people_without_identity'
  );
});

test('how many documents a template makes is read off the template', () => {
  expect(supportStatementTemplatePersons('criminal-record-request')).toBe(SupportReferralPersons.ONE_EACH);
  expect(supportStatementTemplatePersons('referral-police')).toBe(SupportReferralPersons.LISTED);
  expect(supportStatementTemplatePersons('referral-general')).toBe(SupportReferralPersons.NONE);
});

test('an identity code is written the way a form is read, with a hyphen', () => {
  expect(
    supportReferralPeople([{ name: 'Erik Exempelsson', partyId: 'p1', identity: { code: '198001011234' } }])[0]
  ).toMatchObject({
    personalNumber: '19800101-1234',
  });
});

test('the people are read off the company engagements, surname last', () => {
  expect(
    supportReferralPeople([
      {
        partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
        name: 'Maria Anna Exempelsdotter',
        identity: { code: '198505055678' },
        relations: [{ description: 'VD' }, { description: 'Styrelsesuppleant' }],
        marked: true,
      },
      { name: 'Utan identitet' },
    ])
  ).toEqual([
    {
      partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
      name: 'Maria Anna Exempelsdotter',
      firstName: 'Maria Anna',
      lastName: 'Exempelsdotter',
      personalNumber: '19850505-5678',
      roles: 'VD, Styrelsesuppleant',
      marked: true,
    },
  ]);
});

test('the premises are read from the errand, and the owner stands in when they share an address', () => {
  const ofItsOwn = errandOf({
    jsonParameters: [
      {
        value: {
          serveringsstalletsBesoksadress: { gatuadress: 'Kyrkogatan 6', postnummer: '852 31', postort: 'Sundsvall' },
        },
      },
    ],
  });

  expect(
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'referral-general',
      counterpartyName: 'Kronofogden',
      errand: ofItsOwn,
    })
  ).toMatchObject({ premisesStreet: 'Kyrkogatan 6', premisesPostalAddress: '852 31 Sundsvall' });
});

test('the premises name is read whether the form wrote it plainly or as a field of its own', () => {
  const named = (serveringsstalletsNamn: unknown) =>
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'referral-general',
      counterpartyName: 'Kronofogden',
      errand: errandOf({ jsonParameters: [{ value: { serveringsstalletsNamn } }] }),
    }).premisesName;

  expect(named({ namn: 'Testrestaurangen' })).toBe('Testrestaurangen');
  expect(named('Testrestaurangen')).toBe('Testrestaurangen');
  expect(named(undefined)).toBe('Krogen Exempel AB');
});

test('the premises are the owner’s under either name the question has had', () => {
  const asked = (question: string) =>
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'referral-general',
      counterpartyName: 'Kronofogden',
      errand: errandOf({ jsonParameters: [{ value: { [question]: 'JA' } }] }),
    }).premisesStreet;

  expect(asked('besoksadressSammaSomForetaget')).toBe('Storgatan 1');
  expect(asked('besoksadressSammaSomArendeagare')).toBe('Storgatan 1');
});

test('every parameter the templates require of us is sent, the rest they default themselves', () => {
  const REQUIRED: Record<string, string[]> = {
    'referral-police': ['caseNumber', 'documentDate', 'handlerName', 'persons', ...PREMISES],
    'referral-general': [
      'applicantName',
      'applicantOrgNumber',
      'caseNumber',
      'documentDate',
      'handlerName',
      'replyDeadline',
      ...PREMISES,
    ],
    'referral-enforcement-authority': [
      'caseNumber',
      'documentDate',
      'handlerName',
      'recipientName',
      'recipientStreet',
      'recipientPostalAddress',
      'replyDeadline',
      ...PREMISES,
    ],
    'referral-rescue-service': [
      'caseNumber',
      'documentDate',
      'handlerName',
      'recipientName',
      'recipientStreet',
      'recipientPostalAddress',
      'replyDeadline',
      ...PREMISES,
    ],
    'criminal-record-request': [
      'firstName',
      'lastName',
      'personalNumber',
      'handlerName',
      'handlerEmail',
      'requesterAuthority',
      'requesterAddress',
      'requesterPostalCode',
      'requesterCity',
    ],
    'tax-agency-request-serving': [
      'applicantName',
      'applicantOrgNumber',
      'caseType',
      'documentDate',
      'handlerName',
      'handlerEmail',
      'representatives',
      ...PREMISES,
    ],
    'tax-agency-request-serving-inspection': [
      'documentDate',
      'handlerName',
      'handlerEmail',
      'permitHolderName',
      'permitHolderOrgNumber',
      'representatives',
      ...PREMISES,
    ],
    'tax-agency-request-tobacco-company': ['applicantName', 'applicantOrgNumber', 'handlerName'],
    'tax-agency-request-tobacco-pbi': [
      'applicantName',
      'applicantOrgNumber',
      'handlerName',
      'pbiName',
      'pbiPersonalNumber',
    ],
  };

  for (const [identifier, required] of Object.entries(REQUIRED)) {
    const sent = supportStatementTemplateParameters({
      ...facts,
      identifier,
      counterpartyName: counterpartyOfTemplate[identifier],
      errand: errandOf({ labels: [{ classification: 'TYPE', displayName: 'Ansökan om serveringstillstånd' }] }),
      people,
      person: people[0],
    });
    expect(Object.keys(sent).sort(), identifier).toEqual(expect.arrayContaining([...required].sort()));
  }
});
