import { describe, expect, test } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  certificateTemplate,
  type DecisionParameterInput,
  decisionRequiresClauses,
  decisionSchema,
  flattenDecisionJson,
  missingDecisionInputs,
  missingPermitInputs,
  savedDecisionJson,
  toCertificateParameters,
  toDecisionJson,
} from './support-decision-parameters-service';
import { supportDecisionPermitType } from './support-decision-service';
import type { SupportErrand } from './support-errand-service';
import { objectAt } from './support-json-parameter-service';

const HOLDER = mockEnv.mockCompanyAddress;
const PREMISES = mockEnv.mockPremisesAddress;
const EXISTING = { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber } as const;
const NEW = { kind: 'NEW' } as const;
const TODAY = '2026-10-07';
const ISSUED = '2026-10-09';
const DECISION_CASE_NUMBER = 'KS 2026/123';
const DECISION = { decisionText: 'Bifall', decisionMaker: 'Nämnd', validFrom: '2026-11-01', terms: ['A', 'B'] };
const WITH_CLAUSES = { ...DECISION, clauses: 'att bevilja tillstånd' };

const errand = () =>
  ({
    errandNumber: mockEnv.mockErrandNumber,
    customer: [
      {
        stakeholderType: 'ORGANIZATION',
        organizationName: mockEnv.mockCompanyName,
        organizationNumber: mockEnv.mockOrganizationNumber,
        careOf: 'c/o Test',
        address: HOLDER.street,
        zipCode: HOLDER.postalCode,
        city: HOLDER.city,
        phoneNumbers: [{ value: mockEnv.mockPhoneNumber }],
        emails: [],
      },
    ],
  } as unknown as SupportErrand);

const input = (overrides: Partial<DecisionParameterInput> = {}): DecisionParameterInput => ({
  errand: errand(),
  premises: { ...PREMISES, choice: EXISTING },
  executionDate: ISSUED,
  externalCaseRegistrationNumber: DECISION_CASE_NUMBER,
  user: { name: 'Test Testsson' },
  today: TODAY,
  ...overrides,
});

/** What the handler decided, as the tab prefills it from the serving form below. */
const servingScope = {
  beverages: ['STRONG_BEER', 'WINE', 'SPIRITS'],
  servingHours: {
    indoorPublic: { from: '11:00', to: '01:00' },
    outdoorPublic: { from: '11:00', to: '23:00' },
    indoorPrivate: { from: '18:00', to: '02:00' },
    outdoorPrivate: { from: '', to: '' },
  },
};

const json = (permitType: string, overrides: Partial<DecisionParameterInput> = {}) =>
  toDecisionJson(permitType, input(overrides), DECISION);

/** What the certificate template reads off the saved JSON, as the process flattens it. */
const sent = (permitType: string, overrides: Partial<DecisionParameterInput> = {}) =>
  flattenDecisionJson(json(permitType, overrides), mockEnv.mockErrandNumber);

const servingForm = {
  premisesName: mockEnv.mockPremisesName,
  premisesContact: { phoneNumber: mockEnv.mockPhoneNumber, emailAddress: 'a@b.se' },
  servingAudience: 'PUBLIC_AND_CLOSED_COMPANY',
  publicServingPeriod: 'ALL_YEAR',
  publicServingHoursIndoor: { from: '11:00:00', to: '01:00:00' },
  publicServingHoursOutdoor: { from: '11:00', to: '23:00' },
  closedCompanyServingPeriod: 'ANNUAL_PERIOD',
  closedCompanyServingPeriodDates: { fromDate: '2026-05-01', toDate: '2026-09-30' },
  // The schema asks for an RFC 3339 time, so an application carries the offset; the hours read the same.
  closedCompanyServingHoursIndoor: { from: '18:00:00+02:00', to: '02:00:00+02:00' },
  beverages: ['STRONG_BEER', 'WINE', 'SPIRITS'],
  seating: { seatsIndoor: '60', seatsOutdoor: '30' },
  maxPersonsInPremises: { maxPersons: '90' },
};

describe('a serving permit', () => {
  const parameters = sent('SERVERINGSTILLSTAND', {
    form: servingForm,
    scope: servingScope,
    servingAreaDescription: ' Matsalen och uteserveringen ',
    attachments: [
      { fileName: 'plan-1.pdf', purpose: { name: 'FLOOR_PLAN' } },
      { fileName: 'meny.pdf', purpose: { name: 'MENU' } },
      { fileName: 'kok.pdf', purpose: { name: 'KITCHEN_FLOOR_PLAN' } },
      { fileName: 'utan-syfte.pdf' },
    ],
  });

  test('describes the serving area as the handler wrote it, and names the drawings among the attachments', () => {
    expect(parameters.servingAreaDescription).toBe('Matsalen och uteserveringen');
    expect(parameters.servingAreaDrawingReference).toBe('plan-1.pdf, kok.pdf');
  });

  test('carries the permit holder from the errand owner', () => {
    expect(parameters).toMatchObject({
      permitHolderName: mockEnv.mockCompanyName,
      permitHolderOrgNumber: mockEnv.mockOrganizationNumber,
      permitHolderStreet: HOLDER.street,
      permitHolderPostalAddress: `${HOLDER.postalCode} ${HOLDER.city}`,
      permitHolderPhone: mockEnv.mockPhoneNumber,
    });
  });

  test('the handler’s telephone to the premises wins over the one the application gave', () => {
    expect(
      sent('SERVERINGSTILLSTAND', { form: servingForm, premisesPhoneNumber: mockEnv.mockSecondaryPhoneNumber })
        .premisesPhone
    ).toBe(mockEnv.mockSecondaryPhoneNumber);
    expect(sent('SERVERINGSTILLSTAND', { form: servingForm }).premisesPhone).toBe(mockEnv.mockPhoneNumber);
  });

  test('carries the premises as filed, with the restaurant number the handler chose', () => {
    expect(parameters).toMatchObject({
      premisesName: mockEnv.mockPremisesName,
      premisesStreet: PREMISES.street,
      premisesPostalAddress: `${PREMISES.postalCode} ${PREMISES.city}`,
      premisesPhone: mockEnv.mockPhoneNumber,
      premisesRestaurantNumber: mockEnv.mockRestaurantNumber,
    });
    expect(json('SERVERINGSTILLSTAND', { premises: { ...PREMISES, choice: NEW } }).premises).toEqual({
      address: PREMISES,
      newRestaurantNumber: true,
    });
  });

  test('carries the decision itself and its terms as the conditions', () => {
    expect(parameters).toMatchObject({
      decisionText: 'Bifall',
      decisionMaker: 'Nämnd',
      decisionDate: TODAY,
      validFrom: '2026-11-01',
      conditions: 'A\nB',
    });
  });

  test('reads the audiences, periods and seats off the form, the beverages and hours off the decision', () => {
    expect(parameters).toMatchObject({
      servingToPublic: 'true',
      servingToClosedCompany: 'true',
      scopeAllYear: 'true',
      scopeAnnualPeriod: 'true',
      scopeTasting: 'false',
      // An annual period is the same days every year, so the year is not kept.
      scopePeriodFromTo: '05-01 – 09-30',
      beverageSpirits: 'true',
      beverageWine: 'true',
      beverageBeer: 'true',
      beverageOtherFermented: 'false',
      servingAreaSeats: '60',
      servingAreaMaxPersons: '90',
      servingHours: [
        'Inomhus, allmänheten 11:00–01:00',
        'Utomhus, allmänheten 11:00–23:00',
        'Inomhus, slutet sällskap 18:00–02:00',
      ].join('\n'),
    });
  });

  test('prints the errand number, dates the decision with its own case number, and names the issuing handler', () => {
    expect(parameters.caseNumber).toBe(mockEnv.mockErrandNumber);
    expect(parameters.decisionDateAndCaseNumber).toBe(`${TODAY}, ${DECISION_CASE_NUMBER}`);
    expect(parameters.issuedByNameAndTitle).toBe('Test Testsson, handläggare');
  });

  test('the date of issue is the handler’s, and the decision date is today', () => {
    expect(parameters.executionDate).toBe(ISSUED);
    expect(parameters.decisionDate).toBe(TODAY);
    expect(json('SERVERINGSTILLSTAND', { executionDate: undefined }).decision).not.toHaveProperty('executionDate');
  });

  test('a tasting permit is told apart by the errand type', () => {
    expect(sent('SERVERINGSTILLSTAND', { errandType: 'TASTING' }).scopeTasting).toBe('true');
  });

  test('a decided preparation ticks a box of its own, and leaves the four beverages alone', () => {
    const withPreparations = sent('SERVERINGSTILLSTAND', {
      form: servingForm,
      scope: { beverages: ['WINE', 'ALCOHOLIC_BEVERAGE_LIKE_PREPARATIONS'], servingHours: {} },
    });

    expect(withPreparations).toMatchObject({
      beverageWine: 'true',
      beverageSpirits: 'false',
      beverageBeer: 'false',
      beverageOtherFermented: 'false',
      beverageAlcoholLikePreparations: 'true',
    });
    expect(parameters.beverageAlcoholLikePreparations).toBe('false');
  });

  test('the beverages and hours follow the decision even where the form says otherwise', () => {
    const decidedLess = sent('SERVERINGSTILLSTAND', {
      form: servingForm,
      scope: { beverages: ['WINE'], servingHours: { single: { from: '12:00', to: '22:00' } } },
    });

    expect(decidedLess).toMatchObject({
      beverageSpirits: 'false',
      beverageWine: 'true',
      beverageBeer: 'false',
      beverageOtherFermented: 'false',
      servingHours: '12:00–22:00',
    });
  });

  test('a value that is not there is left out of the JSON, as the schema wants, and not sent blank', () => {
    const bare = json('SERVERINGSTILLSTAND', { form: undefined, premises: undefined, executionDate: '' });

    expect(bare).not.toHaveProperty('servingTo');
    expect(bare).not.toHaveProperty('servingArea');
    expect(bare.premises).toBeUndefined();
    expect(bare.decision).not.toHaveProperty('executionDate');
    expect(JSON.stringify(bare)).not.toContain('""');
  });
});

describe('the JSON of a serving permit', () => {
  const saved = json('SERVERINGSTILLSTAND', {
    errandType: 'PERMANENT_SERVING',
    form: servingForm,
    scope: servingScope,
  });

  test('is shaped as the permit in PartyAssets', () => {
    expect(saved).toMatchObject({
      externalCaseRegistrationNumber: DECISION_CASE_NUMBER,
      servingPermitType: 'PERMANENT_SERVING',
      permitHolder: {
        name: mockEnv.mockCompanyName,
        organizationNumber: mockEnv.mockOrganizationNumber,
        address: { careOf: 'c/o Test', ...HOLDER },
        phoneNumber: mockEnv.mockPhoneNumber,
      },
      premises: { address: PREMISES, restaurantNumber: mockEnv.mockRestaurantNumber },
      servingTo: ['PUBLIC', 'CLOSED_COMPANY'],
      servingPeriods: [
        { audience: 'PUBLIC', period: 'ALL_YEAR' },
        { audience: 'CLOSED_COMPANY', period: 'ANNUAL_PERIOD', from: '05-01', to: '09-30' },
      ],
      beverages: ['STRONG_BEER', 'WINE', 'SPIRITS'],
      servingHours: [
        { audience: 'PUBLIC', location: 'INDOOR', from: '11:00', to: '01:00' },
        { audience: 'PUBLIC', location: 'OUTDOOR', from: '11:00', to: '23:00' },
        { audience: 'CLOSED_COMPANY', location: 'INDOOR', from: '18:00', to: '02:00' },
      ],
      servingArea: { seatsIndoor: 60, seatsOutdoor: 30, maxPersons: 90 },
      decision: {
        decisionText: 'Bifall',
        decisionDate: TODAY,
        executionDate: ISSUED,
        issuedBy: { name: 'Test Testsson', title: 'handläggare', unit: 'Alkohol- och tobaksenheten' },
      },
      conditions: ['A', 'B'],
    });
  });

  test('a period is kept only for an audience the application serves', () => {
    const publicOnly = json('SERVERINGSTILLSTAND', { form: { ...servingForm, servingAudience: 'PUBLIC' } });

    expect(publicOnly.servingPeriods).toEqual([{ audience: 'PUBLIC', period: 'ALL_YEAR' }]);
  });

  test('a value the schema would refuse is left out instead of failing the save', () => {
    const odd = errand();
    odd.customer[0] = { ...odd.customer[0], zipCode: 'okänt', organizationNumber: 'saknas' };
    const withOddValues = toDecisionJson('SERVERINGSTILLSTAND', input({ errand: odd, errandType: 'CHANGE' }), {
      ...DECISION,
      outcome: 'SOMETHING_ELSE',
    });

    expect(withOddValues.permitHolder).not.toHaveProperty('organizationNumber');
    expect(withOddValues.permitHolder).toMatchObject({ address: { street: HOLDER.street, city: HOLDER.city } });
    expect(withOddValues).not.toHaveProperty('servingPermitType');
    expect(withOddValues.decision).not.toHaveProperty('outcome');
  });

  test('a decision may be saved with any outcome, or with none', () => {
    expect(json('SERVERINGSTILLSTAND').decision).not.toHaveProperty('outcome');
    expect(toDecisionJson('SERVERINGSTILLSTAND', input(), { ...DECISION, outcome: 'REJECTED' }).decision).toMatchObject(
      { outcome: 'REJECTED' }
    );
  });

  test('a cleared choice is kept as an empty list, so it wins over the application', () => {
    const cleared = json('SERVERINGSTILLSTAND', {
      form: servingForm,
      scope: { beverages: [], servingHours: { single: { from: '', to: '' } } },
    });

    expect(cleared).toMatchObject({ beverages: [], servingHours: [] });
  });

  test('is saved against the schema of the permit area', () => {
    expect(decisionSchema('SERVERINGSTILLSTAND')).toEqual({ name: 'aot_alcohol_decision', version: '1.2' });
    expect(decisionSchema('ECIGARETTFORSALJNING')).toEqual({ name: 'aot_tobacco_decision', version: '1.2' });
    expect(
      savedDecisionJson({ jsonParameters: [{ key: 'aot_alcohol_decision', schemaId: 'x', value: saved }] })
    ).toEqual(saved);
    expect(
      savedDecisionJson({ jsonParameters: [{ key: 'aot_tobacco_decision', schemaId: 'x', value: saved }] })
    ).toEqual(saved);
    expect(savedDecisionJson({})).toBeUndefined();
  });
});

describe('a tobacco permit', () => {
  const form = {
    premisesName: mockEnv.mockPremisesName,
    premisesContact: { phoneNumber: mockEnv.mockPhoneNumber },
    includesDistanceSelling: 'YES',
    salesPeriod: 'TEMPORARY',
    salesPeriodDates: { fromDate: '2026-11-01', toDate: '2027-10-31' },
  };
  const parameters = sent('TOBAKSFORSALJNING', { form });

  test('carries the holder with its care-of, and the premises', () => {
    expect(parameters).toMatchObject({
      permitHolderName: mockEnv.mockCompanyName,
      permitHolderCareOf: 'c/o Test',
      premisesName: mockEnv.mockPremisesName,
      premisesStreet: PREMISES.street,
      premisesPhone: mockEnv.mockPhoneNumber,
    });
    expect(parameters.premisesPropertyDesignation).toBeUndefined();
    expect(json('TOBAKSFORSALJNING', { form })).toHaveProperty('pointOfSale');
  });

  test('the terms are the information of a tobacco permit, which the process does not fill', () => {
    expect(parameters.information).toBe('A\nB');
    expect(parameters.conditions).toBeUndefined();
  });

  test('reads the sales channels and validity off the form', () => {
    expect(json('TOBAKSFORSALJNING', { form })).toMatchObject({
      salesTypes: ['DISTANCE_SELLING'],
      salesPeriod: { period: 'TEMPORARY', from: '2026-11-01', to: '2027-10-31' },
    });
    expect(parameters).toMatchObject({
      salesRetail: 'false',
      salesWholesale: 'false',
      salesOnline: 'true',
      validityIndefinite: 'false',
      validityTemporary: 'true',
      temporaryPeriod: '2026-11-01 – 2027-10-31',
    });
  });

  test('names the officer with the decision case number, and as the issuing handler', () => {
    expect(parameters.decisionOfficerAndCaseNumber).toBe(`Test Testsson, ${DECISION_CASE_NUMBER}`);
    expect(parameters.issuedByNameAndTitle).toBe('Test Testsson, handläggare');
  });

  test('a holder who is a person is named by first and last name', () => {
    const person = errand();
    person.customer[0] = {
      ...person.customer[0],
      organizationName: undefined,
      firstName: 'Anna',
      lastName: 'Andersson',
    };

    expect(sent('TOBAKSFORSALJNING', { errand: person }).permitHolderName).toBe('Anna Andersson');
  });
});

describe('what the permit needs of the errand', () => {
  const PERMANENT = 'PERMANENT_SERVING';
  const drawing = [{ fileName: 'plan-1.pdf', purpose: { name: 'FLOOR_PLAN' } }];

  test('a whole application and a whole applicant leave nothing missing', () => {
    expect(missingPermitInputs('SERVERINGSTILLSTAND', PERMANENT, errand(), servingForm, drawing)).toEqual({
      fromTheErrand: [],
      fromTheApplication: [],
    });
  });

  test('what the handler fills is told apart from what only the applicant can complete', () => {
    const bare = errand();
    bare.customer[0] = { ...bare.customer[0], address: '', zipCode: '', city: '', phoneNumbers: [] };

    expect(missingPermitInputs('SERVERINGSTILLSTAND', PERMANENT, bare, undefined, [])).toEqual({
      fromTheErrand: ['permitHolderStreet', 'permitHolderPostalAddress', 'permitHolderPhone'],
      fromTheApplication: [
        'premisesName',
        'servingAreaSeats',
        'servingAreaMaxPersons',
        'servingHours',
        'servingAreaDrawingReference',
      ],
    });
  });

  test('a drawing nobody attached', () => {
    expect(missingPermitInputs('SERVERINGSTILLSTAND', PERMANENT, errand(), servingForm, [])).toEqual({
      fromTheErrand: [],
      fromTheApplication: ['servingAreaDrawingReference'],
    });
  });

  test('the telephone to the premises is the handler’s, so the review does not wait for it', () => {
    const withoutPhone = { ...servingForm, premisesContact: {} };

    expect(
      missingPermitInputs('SERVERINGSTILLSTAND', PERMANENT, errand(), withoutPhone, drawing).fromTheApplication
    ).toEqual([]);
  });

  test('the decision is checked on what it saved', () => {
    const complete = toDecisionJson(
      'SERVERINGSTILLSTAND',
      input({ form: servingForm, servingAreaDescription: 'Matsalen' }),
      WITH_CLAUSES
    );

    expect(missingDecisionInputs('SERVERINGSTILLSTAND', 'APPROVAL', complete)).toEqual([]);
    expect(missingDecisionInputs('SERVERINGSTILLSTAND', 'APPROVAL', undefined)).toEqual([
      'decisionText',
      'decisionMaker',
      'validFrom',
      'executionDate',
      'premisesStreet',
      'premisesPostalAddress',
      'premisesPhone',
      'servingAreaDescription',
      'decisionClauses',
    ]);
    expect(
      missingDecisionInputs(
        'SERVERINGSTILLSTAND',
        'APPROVAL',
        toDecisionJson('SERVERINGSTILLSTAND', input({ form: servingForm }), { ...WITH_CLAUSES, validFrom: '' })
      )
    ).toEqual(['validFrom', 'servingAreaDescription']);
  });

  test('the decision case number is saved as the external one, and caseRegistrationNumber is ignored', () => {
    const saved = toDecisionJson('FOLKOLSANMALAN', input({ externalCaseRegistrationNumber: ' 2026/42 ' }), DECISION);

    expect(saved.externalCaseRegistrationNumber).toBe('2026/42');
    expect(saved).not.toHaveProperty('caseRegistrationNumber');
  });

  test('a decision can be sent without a case number of its own', () => {
    const saved = toDecisionJson('FOLKOLSANMALAN', input({ externalCaseRegistrationNumber: '' }), WITH_CLAUSES);

    expect(saved).not.toHaveProperty('externalCaseRegistrationNumber');
    expect(missingDecisionInputs('FOLKOLSANMALAN', 'APPROVAL', saved)).toEqual([]);
  });

  test('a tobacco permit waits for the outcome, the dates and the information it prints', () => {
    expect(missingDecisionInputs('TOBAKSFORSALJNING', 'APPROVAL', undefined)).toEqual([
      'decisionText',
      'validFrom',
      'executionDate',
      'information',
      'decisionClauses',
    ]);
  });

  test('a tobacco decision without terms is held back, since the certificate prints them without a default', () => {
    const withTerms = toDecisionJson('TOBAKSFORSALJNING', input(), WITH_CLAUSES);
    const withoutTerms = toDecisionJson('TOBAKSFORSALJNING', input(), { ...WITH_CLAUSES, terms: [] });

    expect(missingDecisionInputs('TOBAKSFORSALJNING', 'APPROVAL', withTerms)).toEqual([]);
    expect(missingDecisionInputs('TOBAKSFORSALJNING', 'APPROVAL', withoutTerms)).toEqual(['information']);
  });

  test('att-satser are saved on the decision and required, except on an inspection', () => {
    const saved = toDecisionJson('FOLKOLSANMALAN', input(), { ...DECISION, clauses: ' att bevilja\natt servera ' });

    expect(saved.decision).toMatchObject({ clauses: 'att bevilja\natt servera' });
    expect(missingDecisionInputs('FOLKOLSANMALAN', 'APPROVAL', saved)).toEqual([]);
    expect(missingDecisionInputs('TILLSYN', undefined, undefined)).toEqual([]);
  });

  test('an action errand is filed under its own schema, with the sanction it decides', () => {
    const saved = toDecisionJson('ATGARD', input(), {
      ...DECISION,
      outcome: 'WARNING',
      decisionText: 'Varning',
      delegation: 'A 4.2',
      clauses: 'att meddela varning\natt beslutet galler omedelbart',
    });

    expect(decisionSchema('ATGARD')).toEqual({ name: 'aot_action_errand_decision', version: '1.0' });
    expect(saved.decision).toMatchObject({
      outcome: 'WARNING',
      decisionText: 'Varning',
      delegation: 'A 4.2',
      clauses: ['att meddela varning', 'att beslutet galler omedelbart'],
    });
    expect(saved).not.toHaveProperty('conditions');
    expect(saved).not.toHaveProperty('servingArea');
  });

  test('an application outcome on an action errand is left out, and a sanction on an application likewise', () => {
    const sanctionOnAnApplication = toDecisionJson('SERVERINGSTILLSTAND', input(), {
      ...DECISION,
      outcome: 'WARNING',
    });
    const approvalOnAnActionErrand = toDecisionJson('ATGARD', input(), { ...DECISION, outcome: 'APPROVAL' });

    expect(objectAt(sanctionOnAnApplication.decision)).not.toHaveProperty('outcome');
    expect(objectAt(approvalOnAnActionErrand.decision)).not.toHaveProperty('outcome');
  });

  test('the saved decision is read back whichever schema it was filed under', () => {
    const underTheActionErrandSchema = {
      jsonParameters: [{ key: 'aot_action_errand_decision', value: { decision: { outcome: 'REPRIMAND' } } }],
    };

    expect(objectAt(savedDecisionJson(underTheActionErrandSchema as never)?.decision)).toMatchObject({
      outcome: 'REPRIMAND',
    });
  });

  test('the att-satser of an action errand are read back from the list they are kept in', () => {
    const saved = toDecisionJson('ATGARD', input(), {
      ...DECISION,
      outcome: 'REPRIMAND',
      clauses: 'att meddela erinran',
      delegation: 'A 4.2',
    });
    const flat = flattenDecisionJson(saved);

    expect(flat.decisionClauses).toBe('att meddela erinran');
    expect(flat.decisionDelegation).toBe('A 4.2');
    expect(missingDecisionInputs('ATGARD', 'REPRIMAND', saved)).toEqual([]);
  });

  test('an action errand needs att-satser for the sanctions it imposes, and none for letting the matter rest', () => {
    const permitType = supportDecisionPermitType(undefined, 'action-errand');

    expect(permitType).toBe('ATGARD');
    expect(missingDecisionInputs(permitType, 'REPRIMAND', undefined)).toEqual(['decisionClauses']);
    expect(missingDecisionInputs(permitType, 'WARNING', undefined)).toEqual(['decisionClauses']);
    expect(missingDecisionInputs(permitType, 'REVOCATION', undefined)).toEqual(['decisionClauses']);
    expect(missingDecisionInputs(permitType, 'NO_ACTION', undefined)).toEqual([]);
    expect(missingDecisionInputs(permitType, undefined, undefined)).toEqual([]);
    expect(decisionRequiresClauses('TILLSYN', 'WARNING')).toBe(false);
    expect(decisionRequiresClauses('SERVERINGSTILLSTAND', 'APPROVAL_WITH_CONDITIONS')).toBe(true);
  });

  test('a permit that issues no certificate waits for the att-satser alone', () => {
    expect(missingDecisionInputs('FOLKOLSANMALAN', 'APPROVAL', undefined)).toEqual(['decisionClauses']);
    expect(missingPermitInputs('FOLKOLSANMALAN', undefined, errand(), undefined, [])).toEqual({
      fromTheErrand: [],
      fromTheApplication: [],
    });
  });
});

describe('every permit', () => {
  test('the certificate carries the decision too, blank where nothing is known', () => {
    const decision = DECISION;
    const serving = toCertificateParameters('SERVERINGSTILLSTAND', input(), decision);
    expect(serving).toMatchObject({
      decisionText: 'Bifall',
      decisionMaker: 'Nämnd',
      decisionDate: TODAY,
      validFrom: '2026-11-01',
      conditions: 'A\nB',
      executionDate: ISSUED,
      replacesDecision: '',
      servingHours: '',
    });
    expect(
      toCertificateParameters('SERVERINGSTILLSTAND', input({ premises: { ...PREMISES, choice: NEW } }), decision)
        .premisesRestaurantNumber
    ).toBe('');
    expect(toCertificateParameters('TOBAKSFORSALJNING', input(), decision).information).toBe('A\nB');
    expect(certificateTemplate('SERVERINGSTILLSTAND')).toBe('serving-permit-certificate');
    expect(certificateTemplate('FOLKOLSANMALAN')).toBeUndefined();
  });

  test('a permit without a record of its own still carries the holder, the premises and the decision', () => {
    expect(Object.keys(json('FOLKOLSANMALAN', { form: servingForm })).sort()).toEqual(
      ['conditions', 'decision', 'externalCaseRegistrationNumber', 'permitHolder', 'premises'].sort()
    );
  });

  // The keys the permit templates read, less the conditions and the restaurant number the process fills.
  test('the flattened decision names every parameter key the permit templates read', () => {
    const holder = ['permitHolderName', 'permitHolderOrgNumber', 'permitHolderStreet', 'permitHolderPostalAddress'];
    const premises = ['premisesName', 'premisesStreet', 'premisesPostalAddress', 'premisesPhone'];
    const issued = ['caseNumber', 'executionDate', 'issuedByNameAndTitle', 'issuedByUnit'];
    const keys = Object.keys(flattenDecisionJson(undefined));

    expect(keys).toEqual(
      expect.arrayContaining([
        ...holder,
        'permitHolderCareOf',
        'permitHolderPhone',
        ...premises,
        'premisesPropertyDesignation',
        'salesRetail',
        'salesWholesale',
        'salesOnline',
        'validityIndefinite',
        'validityTemporary',
        'temporaryPeriod',
        'decisionOfficerAndCaseNumber',
        'servingToPublic',
        'servingToClosedCompany',
        'scopeAllYear',
        'scopeAnnualPeriod',
        'scopeTasting',
        'scopePeriodFromTo',
        'beverageSpirits',
        'beverageWine',
        'beverageBeer',
        'beverageOtherFermented',
        'beverageAlcoholLikePreparations',
        'servingAreaDescription',
        'servingAreaDrawingReference',
        'servingAreaSeats',
        'servingAreaMaxPersons',
        'servingHours',
        ...issued,
        'decisionDateAndCaseNumber',
      ])
    );
  });
});
