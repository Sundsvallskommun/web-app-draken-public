import { getLegalEntityEngagements, getLegalEntityPersonEngagements } from '@common/services/legal-entity-service';
import type { RJSFSchema } from '@rjsf/utils';
import { beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import type { SupportErrand, SupportStakeholderFormModel } from './support-errand-service';
import { supportFinancingAmount } from './support-financial-suitability-service';
import {
  collectInvestigationBasisParameters,
  type InvestigationBasisFacts,
  type InvestigationBasisInput,
  investigationBasisParameters,
} from './support-investigation-basis-service';
import { withAssessment, withEngagements, withKnowledgeTests, withMotivation, withPbi } from './support-pbi-service';

vi.mock('@common/components/json/utils/schema-utils', () => ({ getRjsfSchema: vi.fn(async () => null) }));
vi.mock('@common/services/legal-entity-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCompanyProfileByPartyId: vi.fn(async () => ({ form: 'Aktiebolag' })),
  getLegalEntityEngagements: vi.fn(async () => []),
  getLegalEntityPersonEngagements: vi.fn(),
}));
vi.mock('./support-statement-service', () => ({
  getSupportStatements: vi.fn(async () => [
    {
      id: 'st-1',
      counterpartyName: 'Polismyndigheten',
      sentAt: '2026-05-12T09:00:00Z',
      outcome: 'NO_REMARK',
    },
  ]),
}));

const ALEX_IDENTITY = mockEnv.mockPersonNumber;
// The same identity with ten digits, the way an older application form keeps it.
const ALEX_SHORT_IDENTITY = `${ALEX_IDENTITY.slice(2, 8)}-${ALEX_IDENTITY.slice(8)}`;
const EVA_IDENTITY = mockEnv.mockSecondaryPersonNumber;
const APPLICANT_ORGANIZATION_NUMBER = mockEnv.mockOrganizationNumber;
const SIDE_COMPANY = {
  organizationNumber: mockEnv.mockSecondaryOrganizationNumber.replace('-', ''),
  name: 'Sidobolaget AB',
};
const HANDLER_NAME = `${mockEnv.mockFirstName} ${mockEnv.mockLastName}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLegalEntityPersonEngagements).mockResolvedValue([SIDE_COMPANY]);
});

const translate = (key: string): string =>
  ({
    'common:knowledge_test.status.approved': 'Godkänt',
    'common:knowledge_test.types.permanent_public': 'Stadigvarande tillstånd till allmänheten',
    'common:premises.right_of_disposal.proven': 'Ja',
    'common:personal_suitability.assessment.approved': 'Godkänd',
  }[key] ?? key);

const person = (internalId: string, firstName: string, lastName: string, role: string): SupportStakeholderFormModel =>
  withPbi(
    {
      internalId,
      externalId: `party-${internalId}`,
      firstName,
      lastName,
      personNumber: '',
      parameters: [],
    } as never,
    { source: 'COMPANY', role }
  );

const alex = withKnowledgeTests(
  withMotivation(
    withEngagements(person('alex', 'Alex', 'Exempel', 'Styrelseledamot'), [SIDE_COMPANY.organizationNumber]),
    'Daglig drift'
  ),
  [
    { type: 'PERMANENT_PUBLIC', status: 'APPROVED', testedAt: '2026-05-26', comment: 'Första försöket' },
    { type: 'Eget prov hos annan kommun', status: 'APPROVED', testedAt: '2026-05-30', comment: '' },
  ]
);

const eva = withMotivation(person('eva', 'Eva', 'Exempel', 'Styrelsesuppleant'), 'Står i baren');

const SECTION_TEXTS: [key: string, text: string][] = [
  ['persons_of_influence', '<p>Bolaget ägs av två fysiska personer.</p>'],
  ['financial_suitability', '<p>Ekonomin bedöms ordnad.</p>'],
  ['premises', '<p>Överblickbarheten är god.</p>'],
  ['lease', '<p>Hyresavtal till 2029.</p>'],
  ['fire_safety', '<p>Två utrymningsvägar.</p>'],
  ['food_and_beverages', '<p>Lättdrycker finns.</p>'],
  ['staffing', '<p>Fem personer i tjänst.</p>'],
  ['communication', '<p>Remissvaren skickades</p><p>2026-05-29 via e-post.</p>'],
  ['child_perspective', '<p>Ingen skola i närheten.</p>'],
];

const investigation = {
  id: 'inv-1',
  conclusion: '<p>Kraven är uppfyllda.</p>',
  recommendation: 'APPROVAL',
  recommendationMotivation: '<p>Bevilja stadigvarande tillstånd.</p><p>Serveringstiden är 11.00-23.00.</p>',
  sections: SECTION_TEXTS.map(([sectionKey, text], index) => ({
    id: `s${index}`,
    sectionKey,
    text,
    sortOrder: index + 1,
  })),
};

const errand = {
  id: 'errand-1',
  errandNumber: mockEnv.mockErrandNumber,
  created: '2026-04-15T08:12:00Z',
  assignedUserId: mockEnv.mockAdUsername,
  labels: [
    { classification: 'CATEGORY', resourceName: 'ALCOHOL', displayName: 'Alkohol' },
    { classification: 'TYPE', resourceName: 'SERVING', displayName: 'Stadigvarande serveringstillstånd' },
  ],
  parameters: [
    { key: 'APPLICATION_COMPLETE_AT', values: ['2026-05-04'] },
    { key: 'PREMISES_INSPECTED_AT', values: ['2026-05-21'] },
    { key: 'PREMISES_RIGHT_OF_DISPOSAL', values: ['PROVEN'] },
    { key: 'PREMISES_RIGHT_OF_DISPOSAL_NOTE', values: ['Hyresavtal 2026-05-01'] },
  ],
  customer: [
    {
      internalId: 'owner',
      externalId: 'party-owner',
      organizationName: mockEnv.mockCompanyName,
      organizationNumber: APPLICANT_ORGANIZATION_NUMBER,
      address: mockEnv.mockCompanyAddress.street,
      zipCode: mockEnv.mockCompanyAddress.postalCode,
      city: mockEnv.mockCompanyAddress.city,
      parameters: [],
    },
  ],
  contacts: [alex, eva],
} as unknown as SupportErrand;

const FORM = {
  serveringsstalletsNamn: mockEnv.mockPremisesName,
  serveringTillAllmanhetenEllerSlutetSallskap: 'ENBART_TILL_ALLMANHETEN',
  alkoholdrycker: ['STARKOL', 'VIN'],
  verksamhetensInriktning: ['RESTAURANG'],
  serveringsperiodForAllmanheten: 'ARET_RUNT',
  serveringstiderInomhusAllmanheten: { startTime: '11:00:00', endTime: '23:00:00' },
  serveringstiderUtomhusAllmanheten: { startTime: '11:00:00', endTime: '23:00:00' },
  serverasMat: 'JA',
  forfoganderattLokal: ['HYRESAVTAL'],
  beskrivVerksamhetensInriktning: '<p>Social mötesplats för bygden.</p>',
  ordningOchNykterhet: '<p>Inga spelningar.</p>',
  serveringsansvarigPersonal: [
    { namn: 'Eva Exempel', personnummer: EVA_IDENTITY },
    { namn: 'Alex Exempel', personnummer: ALEX_SHORT_IDENTITY },
  ],
  sittplatserILokalen: { antalSittplatserInomhus: '32', antalSittplatserUteservering: '100' },
  maximaltAntalPersonerILokalen: { antalPersoner: '50' },
  banklan: [{ langivare: 'Testbanken', beloppKronor: '25000' }],
  ovrigaUpplysningarFinansiering: '<p>Aktieägartillskott vid behov.</p>',
};

const SCHEMA = {
  properties: {
    serveringTillAllmanhetenEllerSlutetSallskap: {
      oneOf: [{ const: 'ENBART_TILL_ALLMANHETEN', title: 'Enbart till allmänheten' }],
    },
    alkoholdrycker: {
      items: {
        oneOf: [
          { const: 'STARKOL', title: 'Starköl' },
          { const: 'VIN', title: 'Vin' },
        ],
      },
    },
    verksamhetensInriktning: { items: { oneOf: [{ const: 'RESTAURANG', title: 'Restaurang' }] } },
    serveringsperiodForAllmanheten: { oneOf: [{ const: 'ARET_RUNT', title: 'Året runt' }] },
    serverasMat: { oneOf: [{ const: 'JA', title: 'Ja' }] },
    forfoganderattLokal: { items: { oneOf: [{ const: 'HYRESAVTAL', title: 'Hyresavtal' }] } },
  },
} as unknown as RJSFSchema;

const COMPANY_ENGAGEMENTS = [
  {
    name: 'Alex Exempel',
    identity: { code: ALEX_IDENTITY, type: 'PERSONNUMMER' },
    relations: [{ description: 'Verkställande direktör' }, { description: 'Styrelseledamot' }],
  },
  {
    name: 'Eva Exempel',
    identity: { code: EVA_IDENTITY, type: 'PERSONNUMMER' },
    relations: [{ description: 'Styrelsesuppleant' }],
  },
  {
    name: 'Rolf Exempel',
    identity: { code: mockEnv.mockTertiaryPersonNumber, type: 'PERSONNUMMER' },
    relations: [{ description: 'Styrelseledamot' }],
  },
  {
    name: 'Granskad Revision AB',
    identity: { code: mockEnv.mockNonexistentPersonNumber, type: 'PERSONNUMMER' },
    relations: [{ description: 'Revisor' }],
  },
];

const STATEMENTS = [
  {
    id: 'st-1',
    counterpartyName: 'Polismyndigheten',
    sentAt: '2026-05-12T09:00:00Z',
    respondedAt: '2026-05-20T13:00:00Z',
    outcome: 'NO_REMARK',
    responseText: '<p>Ingen erinran.</p>',
  },
  {
    id: 'st-2',
    counterpartyName: 'Medelpads Räddningstjänstförbund',
    sentAt: '2026-05-12T09:00:00Z',
    respondedAt: '2026-05-18T13:00:00Z',
    outcome: 'NO_REMARK',
    responseText: 'Inget att erinra.',
  },
  { id: 'st-3', counterpartyName: 'Miljökontoret' },
  { id: 'st-4', counterpartyName: 'Skatteverket', sentAt: '2026-05-12T09:00:00Z' },
];

const METADATA = {
  namespace: 'ALKT',
  decisionOutcomes: [{ name: 'APPROVAL', displayName: 'Bevilja' }],
  statementOutcomes: [{ name: 'NO_REMARK', displayName: 'Ingen erinran' }],
};

const input = (over: Partial<InvestigationBasisInput> = {}): InvestigationBasisInput => ({
  errand,
  namespace: 'ALKT',
  form: FORM,
  schema: SCHEMA,
  investigation,
  statements: STATEMENTS as never,
  attachments: [
    { fileName: 'planritning-testkrogen.pdf', purpose: { name: 'FLOOR_PLAN' } },
    { fileName: 'meny-testkrogen.pdf', purpose: { name: 'MENU' } },
    { fileName: 'dryckesmeny-testkrogen.pdf', purpose: { name: 'DRINKS_MENU' } },
    { fileName: 'ovrigt.pdf', purpose: { name: 'OTHER' } },
  ] as never,
  companyProfile: { form: 'Aktiebolag' },
  companyEngagements: COMPANY_ENGAGEMENTS,
  personEngagements: [SIDE_COMPANY],
  metadata: METADATA as never,
  handlerName: HANDLER_NAME,
  today: '2026-06-05',
  translate,
  ...over,
});

const built = () => investigationBasisParameters(input());

test('the errand and the handler name the document the board reads', () => {
  const parameters = built();

  expect(parameters.documentDate).toBe('2026-06-05');
  expect(parameters.caseNumber).toBe(mockEnv.mockErrandNumber);
  expect(parameters.caseType).toBe('stadigvarande serveringstillstånd');
  expect(parameters.handlerName).toBe(HANDLER_NAME);
  expect(parameters.handlerTitle).toBe('handläggare');
  expect(parameters.issuedByUnit).toBe('Alkohol- och tobaksenheten');
  expect(parameters.applicant).toEqual({
    name: mockEnv.mockCompanyName,
    orgNumber: APPLICANT_ORGANIZATION_NUMBER,
    street: mockEnv.mockCompanyAddress.street,
    postalAddress: `${mockEnv.mockCompanyAddress.postalCode} ${mockEnv.mockCompanyAddress.city}`,
  });
});

test('every written examination goes to the field the template prints it in', () => {
  const parameters = built();

  expect(parameters.company.ownershipHtml).toBe('<p>Bolaget ägs av två fysiska personer.</p>');
  expect(parameters.investigation.financialAssessmentHtml).toBe('<p>Ekonomin bedöms ordnad.</p>');
  expect(parameters.investigation.premisesRemarksHtml).toBe('<p>Överblickbarheten är god.</p>');
  expect(parameters.premises.leaseHtml).toBe('<p>Hyresavtal till 2029.</p>');
  expect(parameters.premises.fireSafetyHtml).toBe('<p>Två utrymningsvägar.</p>');
  expect(parameters.application.foodAndBeveragesHtml).toBe('<p>Lättdrycker finns.</p>');
  expect(parameters.application.staffingHtml).toBe('<p>Fem personer i tjänst.</p>');
  expect(parameters.childPerspectiveHtml).toBe('<p>Ingen skola i närheten.</p>');
});

test('the communication is the one text sent without markup, its paragraphs kept apart', () => {
  expect(built().communication).toBe('Remissvaren skickades\n2026-05-29 via e-post.');
});

test('a script in a written examination never reaches the template', () => {
  const sections = [{ id: 's1', sectionKey: 'lease', text: '<p>Hyra</p><script>alert(1)</script>', sortOrder: 5 }];

  const parameters = investigationBasisParameters(input({ investigation: { ...investigation, sections } }));

  expect(parameters.premises.leaseHtml).toBe('<p>Hyra</p>');
});

test('the people of influence are named by the company data, which is where their personal number comes from', () => {
  const people = built().personsOfInfluence;

  expect(people.map((candidate) => candidate.name)).toEqual(['Alex Exempel', 'Eva Exempel']);
  expect(people[0].personalNumber).toBe(mockEnv.mockPersonNumberDashed);
  expect(people[0].roles).toBe('Verkställande direktör, Styrelseledamot');
  expect(people[0].motivation).toBe('Daglig drift');
});

test('a person of influence carries every knowledge test, the first one where the template prints one', () => {
  const [alexRow] = built().personsOfInfluence;

  expect(alexRow.knowledgeTest).toEqual({
    statusLabel: 'Godkänt',
    testType: 'Stadigvarande tillstånd till allmänheten',
    testedAt: '2026-05-26',
    comment: 'Första försöket',
  });
  expect(alexRow.knowledgeTests).toHaveLength(2);
  expect(alexRow.knowledgeTests[1].testType).toBe('Eget prov hos annan kommun');
});

test('a person without a test gets an empty one, since the template reads its fields either way', () => {
  const [, evaRow] = built().personsOfInfluence;

  expect(evaRow.knowledgeTest).toEqual({ statusLabel: '', testType: '', testedAt: '', comment: '' });
  expect(evaRow.knowledgeTests).toEqual([]);
});

test('a person marked by hand is listed too, without a personal number the errand never kept', () => {
  const byHand = withPbi(
    { internalId: 'mats', firstName: 'Mats', lastName: 'Molin', personNumber: '', parameters: [] } as never,
    { source: 'MANUAL', role: 'Faktisk företrädare' }
  );

  const people = investigationBasisParameters(
    input({ errand: { ...errand, contacts: [alex, eva, byHand] } as SupportErrand })
  ).personsOfInfluence;

  expect(people.map((candidate) => candidate.name)).toEqual(['Alex Exempel', 'Eva Exempel', 'Mats Molin']);
  expect(people[2]).toMatchObject({ personalNumber: '', roles: 'Faktisk företrädare' });
});

test('the company people who are not marked are listed apart, and an auditor is left out', () => {
  const officers = built().company.otherOfficers;

  expect(officers.map((officer) => officer.name)).toEqual(['Rolf Exempel']);
  expect(officers[0]).toMatchObject({
    personalNumber: mockEnv.mockTertiaryPersonNumberDashed,
    roles: 'Styrelseledamot',
  });
});

test('the companies ticked for the people of influence are named once each', () => {
  const parameters = investigationBasisParameters(
    input({
      errand: {
        ...errand,
        contacts: [alex, withEngagements(eva, [SIDE_COMPANY.organizationNumber, '5569999999'])],
      } as SupportErrand,
    })
  );

  expect(parameters.company.associatedCompanies).toEqual([
    {
      name: SIDE_COMPANY.name,
      orgNumber: mockEnv.mockSecondaryOrganizationNumber,
      organizationNumber: mockEnv.mockSecondaryOrganizationNumber,
    },
    { name: '', orgNumber: '5569999999', organizationNumber: '5569999999' },
  ]);
});

test('the application is read with the texts of the schema version it was filed against', () => {
  const application = built().application;

  expect(application.receivedAt).toBe('2026-04-15');
  expect(application.completeAt).toBe('2026-05-04');
  expect(application.servingTo).toBe('Enbart till allmänheten');
  expect(application.beverages).toBe('Starköl, Vin');
  expect(application.orientation).toBe('Restaurang');
  expect(application.period).toBe('Året runt');
  expect(application.rightOfDisposal).toBe('Hyresavtal');
  expect(application.servesFood).toBe('Ja');
  expect(application.servingHours).toEqual(['Inomhus, allmänheten 11:00–23:00', 'Utomhus, allmänheten 11:00–23:00']);
  expect(application.menuFiles).toEqual(['meny-testkrogen.pdf']);
  expect(application.drinksMenuFiles).toEqual(['dryckesmeny-testkrogen.pdf']);
});

test('the staff of the application is read by the shape of the row, the columns being named differently between schemas', () => {
  expect(built().application.responsibleStaff).toEqual([
    { name: 'Eva Exempel', personalNumber: mockEnv.mockSecondaryPersonNumberDashed },
    { name: 'Alex Exempel', personalNumber: ALEX_SHORT_IDENTITY },
  ]);
});

test('the financing of the application travels as its own rows', () => {
  const financing = built().application.financing;

  expect(financing.sources).toEqual([
    { kind: 'Banklån', lender: 'Testbanken', amount: supportFinancingAmount('25000') },
  ]);
  expect(financing.notesHtml).toBe('<p>Aktieägartillskott vid behov.</p>');
});

test('the premises carry what the application asks and what the handler established', () => {
  const premises = built().premises;

  expect(premises.name).toBe(mockEnv.mockPremisesName);
  expect(premises.seatsIndoor).toBe('32');
  expect(premises.seatsOutdoor).toBe('100');
  expect(premises.maxPersons).toBe('50');
  expect(premises.inspectedAt).toBe('2026-05-21');
  expect(premises.rightOfDisposalLabel).toBe('Ja');
  expect(premises.rightOfDisposalNote).toBe('Hyresavtal 2026-05-01');
  expect(premises.floorPlanFiles).toEqual(['planritning-testkrogen.pdf']);
  expect(premises.fireSafety).toBe('Medelpads Räddningstjänstförbund: Ingen erinran');
});

test('a referral is a row once it has gone out, answered or not', () => {
  const statements = built().statements;

  expect(statements.map((statement) => statement.counterparty)).toEqual([
    'Polismyndigheten',
    'Medelpads Räddningstjänstförbund',
    'Skatteverket',
  ]);
  expect(statements[0]).toEqual({
    counterparty: 'Polismyndigheten',
    sentAt: '2026-05-12',
    respondedAt: '2026-05-20',
    outcomeLabel: 'Ingen erinran',
    responseText: 'Ingen erinran.',
  });
});

test('a referral still waiting is sent without an answer, which the template reports as such', () => {
  const waiting = built().statements.find((statement) => statement.counterparty === 'Skatteverket');

  expect(waiting).toEqual({
    counterparty: 'Skatteverket',
    sentAt: '2026-05-12',
    respondedAt: '',
    outcomeLabel: '',
    responseText: '',
  });
});

test('a referral card opened but never sent is not a row at all', () => {
  expect(built().statements.map((statement) => statement.counterparty)).not.toContain('Miljökontoret');
});

test('the proposal is the motivation of the recommendation, one point per line', () => {
  expect(built().proposal.points).toEqual(['Bevilja stadigvarande tillstånd.', 'Serveringstiden är 11.00-23.00.']);
});

test('without a motivation the proposed decision stands as the only point', () => {
  const parameters = investigationBasisParameters(
    input({ investigation: { ...investigation, recommendationMotivation: '' } })
  );

  expect(parameters.proposal.points).toEqual(['Bevilja']);
  expect(parameters.investigation.recommendationLabel).toBe('Bevilja');
});

test('an investigation that has only been started says what is missing instead of printing a blank', () => {
  const parameters = investigationBasisParameters({
    errand: undefined,
    namespace: undefined,
    form: undefined,
    schema: null,
    investigation: undefined,
    statements: [],
    attachments: [],
    companyProfile: undefined,
    companyEngagements: [],
    personEngagements: [],
    metadata: undefined,
    handlerName: '',
    today: '2026-06-05',
    translate,
  });

  expect(Object.values(parameters.application).every((value) => value !== undefined)).toBe(true);

  // The examinations nobody wrote say so, since the template would otherwise leave them out entirely.
  expect(parameters.company.ownershipHtml).toBe('Information saknas');
  expect(parameters.premises.leaseHtml).toBe('Information saknas');
  expect(parameters.premises.fireSafetyHtml).toBe('Information saknas');
  expect(parameters.application.staffingHtml).toBe('Information saknas');
  expect(parameters.application.foodAndBeveragesHtml).toBe('Information saknas');
  expect(parameters.investigation.premisesRemarksHtml).toBe('Information saknas');
  expect(parameters.investigation.financialAssessmentHtml).toBe('Information saknas');
  expect(parameters.communication).toBe('Information saknas');
  expect(parameters.childPerspectiveHtml).toBe('Information saknas');

  expect(parameters.personsOfInfluence).toEqual([]);
  expect(parameters.proposal.points).toEqual([]);
  expect(parameters.premises.previousPermits).toEqual([]);
});

test('what the template itself has a word for is sent empty, so no note lands inside its sentences', () => {
  const parameters = investigationBasisParameters({
    errand: undefined,
    namespace: undefined,
    form: undefined,
    schema: null,
    investigation: undefined,
    statements: [],
    attachments: [],
    companyProfile: undefined,
    companyEngagements: [],
    personEngagements: [],
    metadata: undefined,
    handlerName: '',
    today: '2026-06-05',
    translate,
  });

  expect(parameters.premises.name).toBe('');
  expect(parameters.premises.inspectedAt).toBe('');
  expect(parameters.premises.seatsIndoor).toBe('');
  expect(parameters.application.completeAt).toBe('');
  expect(parameters.application.knowledgeBasis).toBe('');
  expect(parameters.investigation.conclusionHtml).toBe('');
  expect(parameters.company.shareCapital).toBe('');
  expect(parameters.company.totalShares).toBe('');
  expect(parameters.company.signatory).toBe('');
});

test('a row the handler wrote keeps its empty cells, so no note lands inside a line', () => {
  const [alexRow] = built().personsOfInfluence;

  expect(alexRow.knowledgeTests[1].comment).toBe('');
});

// The fields of the template's own example call. A field it does not get is one it objects to.
const TEMPLATE_FIELDS = [
  'documentDate',
  'caseNumber',
  'caseType',
  'handlerName',
  'handlerTitle',
  'issuedByUnit',
  'issuedByAuthority',
  'communication',
  'childPerspectiveHtml',
  'proposal.points',
  'applicant.name',
  'applicant.orgNumber',
  'applicant.street',
  'applicant.postalAddress',
  'company.form',
  'company.shareCapital',
  'company.totalShares',
  'company.owners',
  'company.ownershipHtml',
  'company.signatory',
  'company.otherOfficers',
  'company.associatedCompanies',
  'application.receivedAt',
  'application.completeAt',
  'application.servingTo',
  'application.beverages',
  'application.period',
  'application.servingHours',
  'application.orientation',
  'application.orientationHtml',
  'application.businessDescriptionHtml',
  'application.orderAndSobrietyHtml',
  'application.rightOfDisposal',
  'application.knowledgeBasis',
  'application.responsibleStaff',
  'application.staffingHtml',
  'application.servesFood',
  'application.menuFiles',
  'application.drinksMenuFiles',
  'application.foodAndBeveragesHtml',
  'application.financing.sources',
  'application.financing.notesHtml',
  'premises.name',
  'premises.street',
  'premises.postalAddress',
  'premises.restaurantNumber',
  'premises.seatsIndoor',
  'premises.seatsOutdoor',
  'premises.maxPersons',
  'premises.inspectedAt',
  'premises.rightOfDisposalLabel',
  'premises.rightOfDisposalNote',
  'premises.leaseHtml',
  'premises.servingAreaDescription',
  'premises.floorPlanFiles',
  'premises.previousPermits',
  'premises.fireSafety',
  'premises.fireSafetyHtml',
  'personsOfInfluence',
  'statements',
  'investigation.recommendationLabel',
  'investigation.financialAssessmentHtml',
  'investigation.premisesRemarksHtml',
  'investigation.conclusionHtml',
  'investigation.recommendationMotivationHtml',
];

const fieldOf = (parameters: object, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], parameters);

test('every field the template reads is sent, since one it does not get is one it objects to', () => {
  const parameters = built();

  expect(TEMPLATE_FIELDS.filter((path) => fieldOf(parameters, path) === undefined)).toEqual([]);
});

test('an investigation with nothing filled in still sends every field the template reads', () => {
  const parameters = investigationBasisParameters({
    errand: undefined,
    namespace: undefined,
    form: undefined,
    schema: null,
    investigation: undefined,
    statements: [],
    attachments: [],
    companyProfile: undefined,
    companyEngagements: [],
    personEngagements: [],
    metadata: undefined,
    handlerName: '',
    today: '2026-06-05',
    translate,
  });

  expect(TEMPLATE_FIELDS.filter((path) => fieldOf(parameters, path) === undefined)).toEqual([]);
});

test('the knowledge of the law is claimed from the tests, the application not asking the question', () => {
  expect(built().application.knowledgeBasis).toBe('har godkänt kunskapsprov');
});

test('without an approved test nothing is claimed in the applicant name, and the template leaves the line out', () => {
  const booked = withKnowledgeTests(eva, [{ type: 'PERMANENT_PUBLIC', status: 'BOOKED', testedAt: '', comment: '' }]);

  const parameters = investigationBasisParameters(
    input({ errand: { ...errand, contacts: [booked] } as SupportErrand })
  );

  expect(parameters.application.knowledgeBasis).toBe('');
});

test('every test of every person travels, the template printing one line each', () => {
  const [alexRow] = built().personsOfInfluence;

  expect(alexRow.knowledgeTests.map((test) => [test.statusLabel, test.testType, test.testedAt])).toEqual([
    ['Godkänt', 'Stadigvarande tillstånd till allmänheten', '2026-05-26'],
    ['Godkänt', 'Eget prov hos annan kommun', '2026-05-30'],
  ]);
});

test('the verdict on each person of influence travels with them', () => {
  const judged = withAssessment(alex, { assessment: 'APPROVED', comment: 'Inget i vandeln' });

  const [alexRow] = investigationBasisParameters(
    input({ errand: { ...errand, contacts: [judged] } as SupportErrand })
  ).personsOfInfluence;

  expect(alexRow.assessmentLabel).toBe('Godkänd');
  expect(alexRow.assessmentComment).toBe('Inget i vandeln');
});

test('what the handler established about the premises for the underlay travels with it', () => {
  const parameters = investigationBasisParameters(
    input({
      errand: {
        ...errand,
        parameters: [
          ...(errand.parameters ?? []),
          { key: 'PREMISES_RESTAURANT_NUMBER', values: ['2262-0112'] },
          { key: 'PREMISES_SERVING_AREA', values: ['Matsalen, uteserveringen och bryggan'] },
          { key: 'PREMISES_PREVIOUS_PERMITS', values: ['2'] },
          { key: 'PREMISES_PREVIOUS_PERMIT_1_HOLDER', values: ['Förra Krögaren AB'] },
          { key: 'PREMISES_PREVIOUS_PERMIT_1_FROM', values: ['2019-05-01'] },
          { key: 'PREMISES_PREVIOUS_PERMIT_1_TO', values: ['2023-09-30'] },
          { key: 'PREMISES_PREVIOUS_PERMIT_2_HOLDER', values: ['Krogen Innan HB'] },
          { key: 'PREMISES_PREVIOUS_PERMIT_2_FROM', values: ['2024-05-15'] },
          { key: 'PREMISES_PREVIOUS_PERMIT_2_TO', values: ['2025-09-30'] },
        ],
      } as SupportErrand,
    })
  );

  expect(parameters.premises.restaurantNumber).toBe('2262-0112');
  expect(parameters.premises.servingAreaDescription).toBe('Matsalen, uteserveringen och bryggan');
  expect(parameters.premises.previousPermits).toEqual([
    { holderName: 'Förra Krögaren AB', validFrom: '2019-05-01', validTo: '2023-09-30' },
    { holderName: 'Krogen Innan HB', validFrom: '2024-05-15', validTo: '2025-09-30' },
  ]);
});

test('the company applying is not one of the companies the representatives are also engaged in', () => {
  const alsoTheApplicant = withEngagements(alex, [
    APPLICANT_ORGANIZATION_NUMBER.replace('-', ''),
    SIDE_COMPANY.organizationNumber,
  ]);

  const parameters = investigationBasisParameters(
    input({ errand: { ...errand, contacts: [alsoTheApplicant, eva] } as SupportErrand })
  );

  expect(parameters.company.associatedCompanies.map((company) => company.orgNumber)).toEqual([
    mockEnv.mockSecondaryOrganizationNumber,
  ]);
});

const factsOf = (over: Partial<InvestigationBasisFacts> = {}): InvestigationBasisFacts => ({
  errand,
  municipalityId: '2281',
  metadata: { ...METADATA, attachmentPurposes: [{ id: 'purpose-1', name: 'DECISION_BASIS' }] } as never,
  attachments: [],
  investigation,
  handlerName: HANDLER_NAME,
  today: '2026-06-05',
  translate,
  ...over,
});

test('what the preview is made of is read from the services, each failure leaving its own part out', async () => {
  vi.mocked(getLegalEntityEngagements).mockRejectedValue(new Error('no company data'));

  const parameters = await collectInvestigationBasisParameters(factsOf());

  expect(parameters.statements.map((statement) => statement.counterparty)).toEqual(['Polismyndigheten']);
  expect(parameters.company.otherOfficers).toEqual([]);
  expect(parameters.company.associatedCompanies).toEqual([
    {
      name: SIDE_COMPANY.name,
      orgNumber: mockEnv.mockSecondaryOrganizationNumber,
      organizationNumber: mockEnv.mockSecondaryOrganizationNumber,
    },
  ]);
  expect(parameters.caseNumber).toBe(mockEnv.mockErrandNumber);
});
