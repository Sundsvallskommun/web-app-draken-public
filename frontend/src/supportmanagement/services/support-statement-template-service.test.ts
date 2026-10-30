import { expect, test, vi } from 'vitest';

vi.mock('@common/components/file-upload/file-upload.component', () => ({
  imageMimeTypes: [],
  documentMimeTypes: [],
}));

import { mockEnv } from '../../tests/mock-env';
import { hyphenatedIdentity } from './support-pbi-service';
import {
  chosenReferralPartyIds,
  supportReferralPeople,
  SupportReferralPersons,
  supportStatementTemplateAsksForCompanies,
  supportStatementTemplateOfQuestion,
  supportStatementTemplateParameters,
  supportStatementTemplatePersons,
  supportStatementTemplateProblem,
  supportStatementTemplates,
} from './support-statement-template-service';

const robotNumber = mockEnv.mockPersonNumber;
const androidNumber = mockEnv.mockSecondaryPersonNumber;

const owner = {
  role: 'PRIMARY',
  organizationName: 'Krogen Exempel AB',
  externalId: 'd5727c45-8c19-42a0-a04a-5ef11d108618',
  parameters: [{ key: 'organizationNumber', values: [mockEnv.mockOrganizationNumber] }],
  address: 'Storgatan 1',
  zipCode: '852 30',
  city: 'Sundsvall',
};

const errandOf = (extra: Record<string, unknown> = {}) =>
  ({
    errandNumber: 'AOT-26100008',
    stakeholders: [owner],
    jsonParameters: [{ value: { premisesAddressSameAsCompany: 'YES' } }],
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
    personalNumber: hyphenatedIdentity(robotNumber),
    roles: 'Styrelseledamot',
    marked: true,
    onTheErrand: true,
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
  expect(identifiers('internal-inspection')).toEqual(['tax-agency-request-serving-inspection', 'referral-general']);
  expect(identifiers('tobacco-sales')).toEqual([
    'tax-agency-request-tobacco-company',
    'tax-agency-request-tobacco-pbi',
    'referral-general',
  ]);
});

test('a low alcohol beer notification asks the tax agency nothing, since no form is written for it', () => {
  for (const processKey of ['low-alcohol-beer-serving', 'low-alcohol-beer-sales', 'low-alcohol-beer-sales-and-serving'])
    expect(
      supportStatementTemplates('Skatteverket', errandOf({ process: { processKey } })).map(
        (template) => template.identifier
      ),
      processKey
    ).toEqual(['referral-general']);
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
    applicantOrgNumber: mockEnv.mockOrganizationNumber,
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
    { personalNumber: hyphenatedIdentity(robotNumber), name: 'Erik Exempelsson', roles: 'Styrelseledamot' },
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
    personalNumber: hyphenatedIdentity(robotNumber),
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
    representatives: [{ personalNumber: hyphenatedIdentity(robotNumber), name: 'Erik Exempelsson' }],
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
    permitHolderOrgNumber: mockEnv.mockOrganizationNumber,
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
    pbiPersonalNumber: hyphenatedIdentity(robotNumber),
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

const engagementOfMaria = {
  name: 'Maria Anna Exempelsdotter',
  identity: { type: 'PERSONNUMMER', code: androidNumber },
  relations: [{ description: 'VD' }, { description: 'Styrelsesuppleant' }],
};

const maria = {
  internalId: 'a3d2e5f1-0000-4000-8000-000000000001',
  externalId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
  personNumber: androidNumber,
  firstName: 'Maria Anna',
  lastName: 'Exempelsdotter',
  parameters: [{ key: 'PBI', values: ['true'] }],
};

const mariaAsReferralPerson = {
  partyId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
  name: 'Maria Anna Exempelsdotter',
  firstName: 'Maria Anna',
  lastName: 'Exempelsdotter',
  personalNumber: hyphenatedIdentity(androidNumber),
  roles: 'VD, Styrelsesuppleant',
  marked: true,
  onTheErrand: true,
};

const erikByHand = {
  internalId: 'a3d2e5f1-0000-4000-8000-000000000002',
  externalId: 'f0c1d2e3-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
  personNumber: robotNumber,
  firstName: 'Erik',
  lastName: 'Exempelsson',
  parameters: [
    { key: 'PBI', values: ['true'] },
    { key: 'PBI_SOURCE', values: ['MANUAL'] },
    { key: 'PBI_ROLE', values: ['Firmatecknare'] },
  ],
};

test('an identity code is written the way a form is read, with a hyphen', () => {
  expect(
    supportReferralPeople(
      [{ name: 'Erik Exempelsson', identity: { type: 'PERSONNUMMER', code: robotNumber } }] as never,
      []
    )[0]
  ).toMatchObject({
    partyId: robotNumber,
    personalNumber: hyphenatedIdentity(robotNumber),
  });
});

test('the people are read off the company engagements, surname last', () => {
  expect(
    supportReferralPeople(
      [
        engagementOfMaria,
        { name: 'Ägarbolaget AB', identity: { type: 'ORGANISATIONSNUMMER', code: '5560269986' } },
        { name: 'Utan identitet' },
      ] as never,
      [maria] as never
    )
  ).toEqual([mariaAsReferralPerson]);
});

test('a person marked by hand is offered beside the ones the company data names', () => {
  expect(supportReferralPeople([engagementOfMaria] as never, [maria, erikByHand] as never)).toEqual([
    mariaAsReferralPerson,
    {
      partyId: 'f0c1d2e3-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
      name: 'Erik Exempelsson',
      firstName: 'Erik',
      lastName: 'Exempelsson',
      personalNumber: hyphenatedIdentity(robotNumber),
      roles: 'Firmatecknare',
      marked: true,
      onTheErrand: true,
    },
  ]);
});

test('a person the company data names is offered once, however they were marked', () => {
  expect(supportReferralPeople([engagementOfMaria] as never, [maria] as never)).toEqual([mariaAsReferralPerson]);
});

test('an unmarked stakeholder the company data says nothing about is not offered', () => {
  const contact = { internalId: 'a3d2e5f1-0000-4000-8000-000000000003', firstName: 'Sara', lastName: 'Sekreterare' };

  expect(supportReferralPeople([] as never, [contact] as never)).toEqual([]);
});

const referralPerson = (partyId: string, marked: boolean) => ({ partyId, marked } as never);

test('a person who appears already marked arrives ticked', () => {
  expect(chosenReferralPartyIds([referralPerson('maria', true), referralPerson('erik', false)], [], [])).toEqual([
    'maria',
  ]);
});

test('a person the handler has unticked stays unticked when the list is read again', () => {
  expect(chosenReferralPartyIds([referralPerson('maria', true)], [], ['maria'])).toEqual([]);
});

test('a person marked while the card is open is added to the ones already chosen', () => {
  expect(
    chosenReferralPartyIds([referralPerson('maria', true), referralPerson('erik', true)], ['maria'], ['maria'])
  ).toEqual(['maria', 'erik']);
});

test('a person who has left the errand is dropped from the chosen ones', () => {
  expect(chosenReferralPartyIds([referralPerson('maria', true)], ['maria', 'erik'], ['maria', 'erik'])).toEqual([
    'maria',
  ]);
});

test('the chosen ones are handed back untouched when nothing changed', () => {
  const chosen = ['maria'];

  expect(chosenReferralPartyIds([referralPerson('maria', true)], chosen, ['maria'])).toBe(chosen);
});

test('the premises are read from the errand, and the owner stands in when they share an address', () => {
  const ofItsOwn = errandOf({
    jsonParameters: [
      {
        value: {
          premisesAddress: { street: 'Kyrkogatan 6', postalCode: '852 31', city: 'Sundsvall' },
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

test('the premises name is read under either prefix, the owner standing in without one', () => {
  const named = (value: Record<string, unknown>) =>
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'referral-general',
      counterpartyName: 'Kronofogden',
      errand: errandOf({ jsonParameters: [{ value }] }),
    }).premisesName;

  expect(named({ premisesName: 'Testrestaurangen' })).toBe('Testrestaurangen');
  expect(named({ pointOfSaleName: 'Testkiosken' })).toBe('Testkiosken');
  expect(named({})).toBe('Krogen Exempel AB');
});

test('the premises are the owner’s under either prefix', () => {
  const asked = (question: string) =>
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'referral-general',
      counterpartyName: 'Kronofogden',
      errand: errandOf({ jsonParameters: [{ value: { [question]: 'YES' } }] }),
    }).premisesStreet;

  expect(asked('pointOfSaleAddressSameAsCompany')).toBe('Storgatan 1');
  expect(asked('premisesAddressSameAsCompany')).toBe('Storgatan 1');
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
      'municipality',
      'representatives',
      ...PREMISES,
    ],
    'tax-agency-request-serving-inspection': [
      'documentDate',
      'handlerName',
      'handlerEmail',
      'municipality',
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

test('the template of an underlay is found again from the question it was written as', () => {
  expect(supportStatementTemplateOfQuestion('Remiss Polismyndigheten')?.identifier).toBe('referral-police');
  expect(supportStatementTemplateOfQuestion('  Remiss Polismyndigheten  ')?.identifier).toBe('referral-police');
  expect(supportStatementTemplateOfQuestion('Begäran Skatteverket, tobakstillstånd PBI')?.identifier).toBe(
    'tax-agency-request-tobacco-pbi'
  );
});

test('a question nobody wrote from a template leaves the card without one', () => {
  expect(supportStatementTemplateOfQuestion('')).toBeUndefined();
  expect(supportStatementTemplateOfQuestion('Något handläggaren skrev själv')).toBeUndefined();
});

test('the companies the handler ticked stand under the representative they belong to', () => {
  const sent = supportStatementTemplateParameters({
    ...facts,
    identifier: 'tax-agency-request-serving',
    counterpartyName: 'Skatteverket',
    errand: errandOf(),
    people,
    companies: {
      [people[0].partyId]: [
        { organizationNumber: mockEnv.mockOrganizationNumber.replace('-', ''), name: 'Drivet AB' },
        { organizationNumber: '5569999999', name: 'Ogiltigt nummer AB' },
      ],
    },
  });

  expect(sent.representatives).toEqual([
    {
      personalNumber: hyphenatedIdentity(robotNumber),
      name: 'Erik Exempelsson',
      companies: [
        { name: 'Drivet AB', orgNumber: mockEnv.mockOrganizationNumber },
        // A number the register gives that fails the check is printed as it stands.
        { name: 'Ogiltigt nummer AB', orgNumber: '5569999999' },
      ],
    },
  ]);
});

test('a representative the handler ticked no company for is listed without any', () => {
  const sent = supportStatementTemplateParameters({
    ...facts,
    identifier: 'tax-agency-request-serving',
    counterpartyName: 'Skatteverket',
    errand: errandOf(),
    people,
  });

  expect(sent.representatives).toEqual([
    { personalNumber: hyphenatedIdentity(robotNumber), name: 'Erik Exempelsson', companies: [] },
  ]);
});

test('only the tax agency templates that list the companies ask for them', () => {
  expect(supportStatementTemplateAsksForCompanies('tax-agency-request-serving')).toBe(true);
  expect(supportStatementTemplateAsksForCompanies('tax-agency-request-serving-inspection')).toBe(true);

  for (const identifier of [
    'referral-police',
    'criminal-record-request',
    'referral-enforcement-authority',
    'referral-rescue-service',
    'tax-agency-request-tobacco-company',
    'tax-agency-request-tobacco-pbi',
    'referral-general',
    'a-template-nobody-has-written',
  ])
    expect(supportStatementTemplateAsksForCompanies(identifier)).toBe(false);
});

const municipalityCodeOf = (code: string) => ({ parameters: [{ key: 'premisesMunicipality', values: [code] }] });

test('the municipality asking is the one the errand names, worded as the tax agency templates word it', () => {
  const sent = supportStatementTemplateParameters({
    ...facts,
    identifier: 'tax-agency-request-serving',
    counterpartyName: 'Skatteverket',
    errand: errandOf(municipalityCodeOf('2262')),
    people,
  });

  expect(sent.municipality).toBe('Timrå kommun');

  // The telephone is the templates own, answered for by a default value; sending an empty one would blank it.
  expect(Object.keys(sent)).not.toContain('handlerPhone');
});

test('an errand with no municipality on it, or one nobody knows, is taken for Sundsvalls own', () => {
  const askFor = (errand: unknown) =>
    supportStatementTemplateParameters({
      ...facts,
      identifier: 'tax-agency-request-serving',
      counterpartyName: 'Skatteverket',
      errand: errand as never,
      people,
    });

  expect(askFor(errandOf()).municipality).toBe('Sundsvalls kommun');
  expect(askFor(errandOf(municipalityCodeOf('2281'))).municipality).toBe('Sundsvalls kommun');
  expect(askFor(errandOf(municipalityCodeOf('1480'))).municipality).toBe('Sundsvalls kommun');
});

test('the inner inspection is told the municipality too, so its own default cannot name the wrong one', () => {
  const sent = supportStatementTemplateParameters({
    ...facts,
    identifier: 'tax-agency-request-serving-inspection',
    counterpartyName: 'Skatteverket',
    errand: errandOf(municipalityCodeOf('2262')),
    people,
  });

  expect(sent.municipality).toBe('Timrå kommun');
});
