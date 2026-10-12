import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  certificateTemplate,
  type DecisionParameterInput,
  PLACEHOLDER,
  premisesFromDecisionParameters,
  servingPermitParameters,
  splitPostalAddress,
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
  user: { name: 'Test Testsson' },
  today: TODAY,
  ...overrides,
});

const asObject = (parameters: Parameter[]): Record<string, string | undefined> =>
  Object.fromEntries(parameters.map((parameter) => [parameter.key, parameter.values?.[0]]));

const servingForm = {
  serveringsstalletsNamn: mockEnv.mockPremisesName,
  kontaktuppgifterTillServeringsstallet: { telefonnummer: mockEnv.mockPhoneNumber, ePostadress: 'a@b.se' },
  serveringTillAllmanhetenEllerSlutetSallskap: 'BADE_TILL_ALLMANHETEN_OCH_TILL',
  serveringsperiodForAllmanheten: 'ARET_RUNT',
  serveringstiderInomhusAllmanheten: { startTime: '11:00:00', endTime: '01:00:00' },
  serveringstiderUtomhusAllmanheten: { startTime: '11:00', endTime: '23:00' },
  serveringsperiodForSlutetSallskap: 'ARLIGEN_UNDER_VISS_PERIOD',
  periodServeringSlutetSallskap: { startDate: '2026-05-01', endDate: '2026-09-30' },
  serveringstiderInomhusSlutetSallskap: { startTime: '18:00', endTime: '02:00' },
  alkoholdrycker: ['STARKOL', 'VIN', 'SPRITDRYCKER'],
  sittplatserILokalen: { antalSittplatserInomhus: '60', antalSittplatserUteservering: '30' },
  maximaltAntalPersonerILokalen: { antalPersoner: '90' },
};

describe('a serving permit', () => {
  const parameters = asObject(
    toDecisionParameters(
      'SERVERINGSTILLSTAND',
      input({
        form: servingForm,
        servingArea: ' Matsalen och uteserveringen ',
        attachments: [
          { fileName: 'plan-1.pdf', purpose: { name: 'FLOOR_PLAN' } },
          { fileName: 'meny.pdf', purpose: { name: 'MENU' } },
          { fileName: 'kok.pdf', purpose: { name: 'KITCHEN_FLOOR_PLAN' } },
          { fileName: 'utan-syfte.pdf' },
        ],
      })
    )
  );

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

  test('carries the premises as filed and as chosen', () => {
    expect(parameters).toMatchObject({
      premisesName: mockEnv.mockPremisesName,
      premisesStreet: PREMISES.street,
      premisesPostalAddress: `${PREMISES.postalCode} ${PREMISES.city}`,
      premisesPhone: mockEnv.mockPhoneNumber,
      premisesRestaurantNumber: mockEnv.mockRestaurantNumber,
    });
  });

  test('reads the audiences, periods, beverages, seats and hours off the form', () => {
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

  test('a tasting permit is told apart by the errand type', () => {
    expect(asObject(toDecisionParameters('SERVERINGSTILLSTAND', input({ errandType: 'TASTING' }))).scopeTasting).toBe(
      'true'
    );
  });

  test('what nothing asks for carries the placeholder, as does what the form left out', () => {
    expect(parameters).toMatchObject({ executionDate: PLACEHOLDER });

    const bare = asObject(toDecisionParameters('SERVERINGSTILLSTAND', input({ form: undefined, premises: undefined })));
    expect(bare).toMatchObject({
      premisesName: PLACEHOLDER,
      premisesStreet: PLACEHOLDER,
      servingToPublic: PLACEHOLDER,
      beverageWine: PLACEHOLDER,
      servingAreaDescription: PLACEHOLDER,
      servingAreaDrawingReference: PLACEHOLDER,
    });
    expect(bare).not.toHaveProperty('premisesRestaurantNumber');
    expect(bare).not.toHaveProperty('newRestaurantNumber');
    expect(Object.values(bare).some((value) => !value)).toBe(false);
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
  const parameters = asObject(toDecisionParameters('TOBAKSFORSALJNING', input({ form })));

  test('carries the holder with its care-of, and the premises', () => {
    expect(parameters).toMatchObject({
      permitHolderName: mockEnv.mockCompanyName,
      permitHolderCareOf: 'c/o Test',
      premisesName: mockEnv.mockPremisesName,
      premisesStreet: PREMISES.street,
      premisesPhone: mockEnv.mockPhoneNumber,
      premisesPropertyDesignation: PLACEHOLDER,
    });
    expect(parameters).not.toHaveProperty('permitHolderPhone');
  });

  test('reads the sales channels and validity off the form', () => {
    expect(parameters).toMatchObject({
      salesRetail: PLACEHOLDER,
      salesWholesale: PLACEHOLDER,
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

    expect(asObject(toDecisionParameters('TOBAKSFORSALJNING', input({ errand: person }))).permitHolderName).toBe(
      'Anna Andersson'
    );
  });
});

describe('every permit', () => {
  test('the certificate carries the decision too, blank where nothing is known', () => {
    const decision = { decisionText: 'Bifall', decisionMaker: 'Nämnd', validFrom: '2026-11-01', terms: ['A', 'B'] };
    const serving = toCertificateParameters('SERVERINGSTILLSTAND', input(), decision);
    expect(serving).toMatchObject({
      decisionText: 'Bifall',
      decisionMaker: 'Nämnd',
      decisionDate: TODAY,
      validFrom: '2026-11-01',
      conditions: 'A\nB',
      executionDate: '',
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

  test('a permit without a record of its own still carries the premises', () => {
    expect(Object.keys(asObject(toDecisionParameters('FOLKOLSANMALAN', input())))).toEqual([
      'premisesName',
      'premisesStreet',
      'premisesPostalAddress',
      'premisesPhone',
      'premisesRestaurantNumber',
    ]);
  });

  test('the premises and the choice are read back from what was sent', () => {
    for (const permitType of ['SERVERINGSTILLSTAND', 'TOBAKSFORSALJNING', 'OTHER']) {
      const existing = toDecisionParameters(permitType, input());
      expect(premisesFromDecisionParameters(existing)).toEqual({ ...PREMISES, choice: EXISTING });

      const fresh = toDecisionParameters(permitType, input({ premises: { ...PREMISES, choice: NEW } }));
      expect(asObject(fresh).newRestaurantNumber).toBe('true');
      expect(asObject(fresh)).not.toHaveProperty('premisesRestaurantNumber');
      expect(premisesFromDecisionParameters(fresh)).toEqual({ ...PREMISES, choice: NEW });
    }
  });

  test('a decision without a complete premises address and a choice carries no premises', () => {
    const sent = (premises: DecisionParameterInput['premises']) =>
      premisesFromDecisionParameters(toDecisionParameters('OTHER', input({ premises })));

    expect(premisesFromDecisionParameters(undefined)).toBeUndefined();
    expect(premisesFromDecisionParameters([])).toBeUndefined();
    expect(premisesFromDecisionParameters([{ key: 'premisesStreet', values: [PREMISES.street] }])).toBeUndefined();
    expect(sent(undefined)).toBeUndefined();
    expect(sent({ ...PREMISES, city: '', choice: NEW })).toBeUndefined();
  });

  test('a postal address splits into code and city whether or not the code has its space', () => {
    expect(splitPostalAddress('852 30 Sundsvall')).toEqual({ postalCode: '852 30', city: 'Sundsvall' });
    expect(splitPostalAddress('85230 Sundsvall')).toEqual({ postalCode: '85230', city: 'Sundsvall' });
    expect(splitPostalAddress('852 30 Sundsvall Centrum')).toEqual({ postalCode: '852 30', city: 'Sundsvall Centrum' });
    expect(splitPostalAddress('Sundsvall')).toBeUndefined();
    expect(splitPostalAddress(undefined)).toBeUndefined();
  });

  // The keys the permit templates read, as handed over, less those on the decision root; the
  // restaurant number rides along for tobacco.
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
        'premisesRestaurantNumber',
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
        'premisesRestaurantNumber',
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
