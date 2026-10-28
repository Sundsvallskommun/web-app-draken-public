import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  certificateTemplate,
  type DecisionParameterInput,
  decisionParameterValue,
  missingDecisionInputs,
  missingPermitInputs,
  PLACEHOLDER,
  servingPermitParameters,
  tobaccoPermitParameters,
  toCertificateParameters,
  toDecisionParameters,
} from './support-decision-parameters-service';
import type { SupportErrand } from './support-errand-service';

const HOLDER = mockEnv.mockCompanyAddress;
const PREMISES = mockEnv.mockPremisesAddress;
const EXISTING = { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber } as const;
const NEW = { kind: 'NEW' } as const;
const TODAY = '2026-10-07';
const ISSUED = '2026-10-09';
const DECISION = { decisionText: 'Bifall', decisionMaker: 'Nämnd', validFrom: '2026-11-01', terms: ['A', 'B'] };

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
  issuedOn: ISSUED,
  user: { name: 'Test Testsson' },
  today: TODAY,
  ...overrides,
});

/** What the handler decided, as the tab prefills it from the serving form below. */
const servingScope = {
  beverages: ['STARKOL', 'VIN', 'SPRITDRYCKER'],
  servingHours: {
    indoorPublic: { from: '11:00', to: '01:00' },
    outdoorPublic: { from: '11:00', to: '23:00' },
    indoorPrivate: { from: '18:00', to: '02:00' },
    outdoorPrivate: { from: '', to: '' },
  },
};

const asObject = (parameters: Parameter[]): Record<string, string | undefined> =>
  Object.fromEntries(parameters.map((parameter) => [parameter.key, parameter.values?.[0]]));

const sent = (permitType: string, overrides: Partial<DecisionParameterInput> = {}) =>
  asObject(toDecisionParameters(permitType, input(overrides), DECISION));

const servingForm = {
  serveringsstalletsNamn: mockEnv.mockPremisesName,
  kontaktuppgifterTillServeringsstallet: { telefonnummer: mockEnv.mockPhoneNumber, ePostadress: 'a@b.se' },
  serveringTillAllmanhetenEllerSlutetSallskap: 'BADE_TILL_ALLMANHETEN_OCH_TILL',
  serveringsperiodForAllmanheten: 'ARET_RUNT',
  serveringstiderInomhusAllmanheten: { startTime: '11:00:00', endTime: '01:00:00' },
  serveringstiderUtomhusAllmanheten: { startTime: '11:00', endTime: '23:00' },
  serveringsperiodForSlutetSallskap: 'ARLIGEN_UNDER_VISS_PERIOD',
  periodServeringSlutetSallskap: { startDate: '2026-05-01', endDate: '2026-09-30' },
  // The schema asks for an RFC 3339 time, so an application carries the offset; the hours read the same.
  serveringstiderInomhusSlutetSallskap: { startTime: '18:00:00+02:00', endTime: '02:00:00+02:00' },
  alkoholdrycker: ['STARKOL', 'VIN', 'SPRITDRYCKER'],
  sittplatserILokalen: { antalSittplatserInomhus: '60', antalSittplatserUteservering: '30' },
  maximaltAntalPersonerILokalen: { antalPersoner: '90' },
};

describe('a serving permit', () => {
  const parameters = sent('SERVERINGSTILLSTAND', {
    form: servingForm,
    scope: servingScope,
    servingArea: ' Matsalen och uteserveringen ',
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
    expect(sent('SERVERINGSTILLSTAND', { form: servingForm, premisesPhone: '060-999999' }).premisesPhone).toBe(
      '060-999999'
    );
    expect(sent('SERVERINGSTILLSTAND', { form: servingForm }).premisesPhone).toBe(mockEnv.mockPhoneNumber);
  });

  test('carries the premises as filed, but not the restaurant number the process resolves', () => {
    expect(parameters).toMatchObject({
      premisesName: mockEnv.mockPremisesName,
      premisesStreet: PREMISES.street,
      premisesPostalAddress: `${PREMISES.postalCode} ${PREMISES.city}`,
      premisesPhone: mockEnv.mockPhoneNumber,
    });
    expect(parameters).not.toHaveProperty('premisesRestaurantNumber');
    expect(parameters).not.toHaveProperty('newRestaurantNumber');
  });

  test('carries the decision itself, since the process adds nothing off its root but the conditions', () => {
    expect(parameters).toMatchObject({
      decisionText: 'Bifall',
      decisionMaker: 'Nämnd',
      decisionDate: TODAY,
      validFrom: '2026-11-01',
    });
    expect(parameters).not.toHaveProperty('conditions');
  });

  test('reads the audiences, periods and seats off the form, the beverages and hours off the decision', () => {
    expect(parameters).toMatchObject({
      servingToPublic: 'true',
      servingToClosedCompany: 'true',
      scopeAllYear: 'true',
      scopeAnnualPeriod: 'true',
      scopeTasting: 'false',
      scopePeriodFromTo: '2026-05-01 – 2026-09-30',
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

  test('composes the case number and the decision date with it, and names the issuing handler', () => {
    expect(parameters.caseNumber).toBe(mockEnv.mockErrandNumber);
    expect(parameters.decisionDateAndCaseNumber).toBe(`${TODAY}, ${mockEnv.mockErrandNumber}`);
    expect(parameters.issuedByNameAndTitle).toBe('Test Testsson, handläggare');
  });

  test('the date of issue is the handler’s, and the decision date is today', () => {
    expect(parameters.executionDate).toBe(ISSUED);
    expect(parameters.decisionDate).toBe(TODAY);
    expect(sent('SERVERINGSTILLSTAND', { issuedOn: undefined })).not.toHaveProperty('executionDate');
  });

  test('a tasting permit is told apart by the errand type', () => {
    expect(sent('SERVERINGSTILLSTAND', { errandType: 'TASTING' }).scopeTasting).toBe('true');
  });

  test('the beverages and hours follow the decision even where the form says otherwise', () => {
    const decidedLess = sent('SERVERINGSTILLSTAND', {
      form: servingForm,
      scope: { beverages: ['VIN'], servingHours: { single: { from: '12:00', to: '22:00' } } },
    });

    expect(decidedLess).toMatchObject({
      beverageSpirits: 'false',
      beverageWine: 'true',
      beverageBeer: 'false',
      beverageOtherFermented: 'false',
      servingHours: '12:00–22:00',
    });
  });

  test('a key without a value is left out, so the strict template names it instead of printing a stand-in', () => {
    const bare = sent('SERVERINGSTILLSTAND', { form: undefined, premises: undefined });
    for (const key of [
      'premisesName',
      'premisesStreet',
      'servingToPublic',
      'beverageWine',
      'servingAreaDescription',
      'servingAreaDrawingReference',
    ]) {
      expect(bare).not.toHaveProperty(key);
    }
    expect(Object.values(bare).some((value) => !value)).toBe(false);
    expect(Object.values(bare)).not.toContain(PLACEHOLDER);
  });
});

describe('a tobacco permit', () => {
  const form = {
    serveringsstalletsNamn: mockEnv.mockPremisesName,
    kontaktuppgifterTillServeringsstallet: { telefonnummer: mockEnv.mockPhoneNumber },
    bedriverAvenDistansforsaljning: 'JA',
    tidsperiodForForsaljningen: 'TIDSBEGRANSAD_FORSALJNING',
    periodTidsbegransadForsaljning: { startDate: '2026-11-01', endDate: '2027-10-31' },
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
    expect(parameters).not.toHaveProperty('permitHolderPhone');
    expect(parameters).not.toHaveProperty('premisesPropertyDesignation');
  });

  test('the terms are the information of a tobacco permit, which the process does not fill', () => {
    expect(parameters.information).toBe('A\nB');
    expect(parameters).not.toHaveProperty('conditions');
  });

  test('reads the sales channels and validity off the form', () => {
    expect(parameters).not.toHaveProperty('salesRetail');
    expect(parameters).not.toHaveProperty('salesWholesale');
    expect(parameters).toMatchObject({
      salesOnline: 'true',
      validityIndefinite: 'false',
      validityTemporary: 'true',
      temporaryPeriod: '2026-11-01 – 2027-10-31',
    });
  });

  test('names the officer with the case number, and as the issuing handler', () => {
    expect(parameters.decisionOfficerAndCaseNumber).toBe(`Test Testsson, ${mockEnv.mockErrandNumber}`);
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
    const withoutPhone = { ...servingForm, kontaktuppgifterTillServeringsstallet: {} };

    expect(
      missingPermitInputs('SERVERINGSTILLSTAND', PERMANENT, errand(), withoutPhone, drawing).fromTheApplication
    ).toEqual([]);
  });

  test('the decision is checked on what it saved, so a concluded decision cannot lack a placeholder', () => {
    const complete = toDecisionParameters(
      'SERVERINGSTILLSTAND',
      input({ form: servingForm, servingArea: 'Matsalen' }),
      DECISION
    );

    expect(missingDecisionInputs('SERVERINGSTILLSTAND', complete)).toEqual([]);
    expect(missingDecisionInputs('SERVERINGSTILLSTAND', undefined)).toEqual([
      'decisionText',
      'decisionMaker',
      'validFrom',
      'executionDate',
      'premisesStreet',
      'premisesPostalAddress',
      'premisesPhone',
      'servingAreaDescription',
    ]);
    expect(
      missingDecisionInputs(
        'SERVERINGSTILLSTAND',
        toDecisionParameters('SERVERINGSTILLSTAND', input({ form: servingForm }), { ...DECISION, validFrom: '' })
      )
    ).toEqual(['validFrom', 'servingAreaDescription']);
  });

  test('a tobacco permit waits for the outcome and the dates it prints', () => {
    expect(missingDecisionInputs('TOBAKSFORSALJNING', undefined)).toEqual([
      'decisionText',
      'validFrom',
      'executionDate',
    ]);
  });

  test('a permit that issues no certificate has nothing to wait for', () => {
    expect(missingDecisionInputs('FOLKOLSANMALAN', undefined)).toEqual([]);
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
    expect(Object.values(serving)).not.toContain(PLACEHOLDER);
    expect(
      toCertificateParameters('SERVERINGSTILLSTAND', input({ premises: { ...PREMISES, choice: NEW } }), decision)
        .premisesRestaurantNumber
    ).toBe('');
    expect(toCertificateParameters('TOBAKSFORSALJNING', input(), decision).information).toBe('A\nB');
    expect(certificateTemplate('SERVERINGSTILLSTAND')).toBe('serving-permit-certificate');
    expect(certificateTemplate('FOLKOLSANMALAN')).toBeUndefined();
  });

  test('a permit without a record of its own still carries the premises and the decision', () => {
    expect(Object.keys(sent('FOLKOLSANMALAN', { form: servingForm }))).toEqual([
      'premisesName',
      'premisesStreet',
      'premisesPostalAddress',
      'premisesPhone',
      'decisionText',
      'decisionMaker',
      'decisionDate',
      'validFrom',
    ]);
  });

  test('a value a decision saved while the placeholder was sent reads back as nothing', () => {
    expect(
      decisionParameterValue([{ key: 'servingAreaDescription', values: [PLACEHOLDER] }], 'servingAreaDescription')
    ).toBeUndefined();
    expect(
      decisionParameterValue([{ key: 'servingAreaDescription', values: ['Matsalen'] }], 'servingAreaDescription')
    ).toBe('Matsalen');
    expect(decisionParameterValue(undefined, 'servingAreaDescription')).toBeUndefined();
  });

  // The keys the permit templates read, as handed over, less the conditions and the restaurant number
  // that the process fills.
  test('the tobacco and serving records name every parameter key the permit templates read, and nothing else', () => {
    const holder = ['permitHolderName', 'permitHolderOrgNumber', 'permitHolderStreet', 'permitHolderPostalAddress'];
    const premises = ['premisesName', 'premisesStreet', 'premisesPostalAddress', 'premisesPhone'];
    const issued = ['caseNumber', 'executionDate', 'issuedByNameAndTitle', 'issuedByUnit'];

    expect(Object.keys(tobaccoPermitParameters(input())).sort()).toEqual(
      [
        ...holder,
        'permitHolderCareOf',
        ...premises,
        'premisesPropertyDesignation',
        'salesRetail',
        'salesWholesale',
        'salesOnline',
        'validityIndefinite',
        'validityTemporary',
        'temporaryPeriod',
        ...issued,
        'decisionOfficerAndCaseNumber',
      ].sort()
    );
    expect(Object.keys(servingPermitParameters(input())).sort()).toEqual(
      [
        ...holder,
        'permitHolderPhone',
        ...premises,
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
        'servingAreaDescription',
        'servingAreaDrawingReference',
        'servingAreaSeats',
        'servingAreaMaxPersons',
        'servingHours',
        ...issued,
        'decisionDateAndCaseNumber',
      ].sort()
    );
  });
});
