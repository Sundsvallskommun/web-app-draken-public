import type { RJSFSchema } from '@rjsf/utils';
import { describe, expect, test } from 'vitest';

import {
  type BasisSection,
  buildDecisionBasisSections,
  type FormValue,
  getDecisionBasisForm,
} from './support-decision-basis-service';
import type { SupportErrand } from './support-errand-service';

const yesNo: RJSFSchema = {
  type: 'string',
  oneOf: [
    { const: 'YES', title: 'Ja' },
    { const: 'NO', title: 'Nej' },
  ],
};
const timeRange: RJSFSchema = {
  type: 'object',
  properties: { from: { type: 'string' }, to: { type: 'string' } },
};
const dateRange: RJSFSchema = {
  type: 'object',
  properties: { fromDate: { type: 'string' }, toDate: { type: 'string' } },
};
const period: RJSFSchema = {
  type: 'string',
  oneOf: [
    { const: 'ALL_YEAR', title: 'Året runt' },
    { const: 'ANNUAL_PERIOD', title: 'Årligen under viss period' },
  ],
};

/** The permanent serving schema, cut down to the questions the sections read. */
const PERMANENT: RJSFSchema = {
  type: 'object',
  properties: {
    businessDescriptionChoice: {
      type: 'string',
      oneOf: [
        { const: 'DESCRIBE', title: 'Skriva' },
        { const: 'UPLOAD', title: 'Bifoga' },
      ],
    },
    businessDescription: { type: 'string' },
    businessOrientationTypes: {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'RESTAURANT', title: 'Restaurang' },
          { const: 'HOTEL', title: 'Hotell' },
        ],
      },
    },
    servingAudience: {
      type: 'string',
      oneOf: [
        { const: 'PUBLIC', title: 'Enbart till allmänheten' },
        { const: 'CLOSED_COMPANY', title: 'Enbart till slutet sällskap' },
        { const: 'PUBLIC_AND_CLOSED_COMPANY', title: 'Både och' },
      ],
    },
    publicServingPeriod: period,
    publicServingPeriodDates: dateRange,
    publicServingHoursIndoor: timeRange,
    publicServingHoursOutdoor: timeRange,
    closedCompanyServingPeriod: period,
    closedCompanyServingPeriodDates: dateRange,
    closedCompanyServingHoursIndoor: timeRange,
    closedCompanyServingHoursOutdoor: timeRange,
    beverages: {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'STRONG_BEER', title: 'Starköl' },
          { const: 'WINE', title: 'Vin' },
        ],
      },
    },
    menuChoice: {
      type: 'string',
      oneOf: [
        { const: 'DESCRIBE', title: 'Beskriva' },
        { const: 'UPLOAD', title: 'Ladda upp' },
      ],
    },
    menuDescription: { type: 'string' },
    financing: {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'OWN_FUNDS', title: 'Egna medel' },
          { const: 'BANK_LOAN', title: 'Banklån' },
        ],
      },
    },
    ownFunds: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bank: { type: 'string', title: 'Bank' },
          accountNumber: { type: 'string', title: 'Kontonummer' },
          amountSek: { type: 'string', title: 'Belopp (kronor)' },
        },
      },
    },
    bankLoans: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lender: { type: 'string', title: 'Långivare' },
          amountSek: { type: 'string', title: 'Belopp (kronor)' },
        },
      },
    },
    premisesName: { type: 'string', title: 'Serveringsställets namn' },
    premisesContact: {
      type: 'object',
      properties: { phoneNumber: { type: 'string' }, emailAddress: { type: 'string' }, website: { type: 'string' } },
    },
    seating: {
      type: 'object',
      properties: { seatsIndoor: { type: 'string' }, seatsOutdoor: { type: 'string' } },
    },
    maxPersonsInPremises: { type: 'object', properties: { maxPersons: { type: 'string' } } },
    hasCooperationAgreement: yesNo,
  },
  'x-attachments': [{ key: 'FLOOR_PLAN', label: 'Planritning' }],
};

const ANSWERS: FormValue = {
  businessDescriptionChoice: 'DESCRIBE',
  businessDescription: '<p>Havsnära restaurang</p>',
  businessOrientationTypes: ['RESTAURANT'],
  servingAudience: 'PUBLIC',
  publicServingPeriod: 'ALL_YEAR',
  publicServingHoursIndoor: { from: '11:00:00', to: '01:00+01:00' },
  publicServingHoursOutdoor: { from: '11:00', to: '23:00' },
  beverages: ['STRONG_BEER', 'WINE'],
  menuChoice: 'DESCRIBE',
  menuDescription: '<p>Toast skagen</p>',
  financing: ['OWN_FUNDS', 'BANK_LOAN'],
  ownFunds: [{ bank: 'Swedbank', accountNumber: '8327-9 412 663 1', amountSek: '600000' }],
  bankLoans: [{ lender: 'Sundsvalls Sparbank', amountSek: '1200000' }],
  premisesName: 'Kustbryggan',
  premisesContact: { phoneNumber: '060-15 40 20', emailAddress: 'info@kustbryggan.se' },
  seating: { seatsIndoor: '72' },
  maxPersonsInPremises: { maxPersons: '110' },
  hasCooperationAgreement: 'NO',
};

const section = (sections: BasisSection[], id: BasisSection['id']) =>
  sections.find((candidate) => candidate.id === id)!;
const row = (sections: BasisSection[], id: BasisSection['id'], key: string) =>
  section(sections, id).rows.find((candidate) => candidate.key === key);
const textOf = (sections: BasisSection[], id: BasisSection['id'], key: string) => {
  const cell = row(sections, id, key)?.cell;
  return cell?.kind === 'text' ? cell.text : cell;
};

describe('getDecisionBasisForm', () => {
  const errand = {
    labels: [
      { classification: 'CATEGORY', resourceName: 'ALCOHOL' },
      { classification: 'TYPE', resourceName: 'FOLKOL_SERVING_NOTIFICATION' },
    ],
    jsonParameters: [
      { key: 'other', schemaId: 'other-id', value: { a: 1 } },
      {
        key: 'aot_alcohol_folkol_serving_notification',
        schemaId: 'folkol-id',
        value: { premisesName: 'Kiosken' },
      },
    ],
  } as unknown as Pick<SupportErrand, 'labels' | 'classification' | 'jsonParameters'>;

  test('picks the answers filed under the schema name of the errand type', () => {
    expect(getDecisionBasisForm(errand, 'AOT')).toEqual({
      schemaId: 'folkol-id',
      value: { premisesName: 'Kiosken' },
    });
  });

  test('an errand without answers, or with answers that are not an object, has no form', () => {
    expect(getDecisionBasisForm({ ...errand, jsonParameters: [] }, 'AOT')).toBeUndefined();
    expect(
      getDecisionBasisForm(
        {
          ...errand,
          jsonParameters: [{ key: 'aot_alcohol_folkol_serving_notification', schemaId: 'x', value: 'text' }],
        },
        'AOT'
      )
    ).toBeUndefined();
    expect(getDecisionBasisForm(errand, undefined)).toBeUndefined();
  });
});

describe('buildDecisionBasisSections', () => {
  const sections = buildDecisionBasisSections(ANSWERS, PERMANENT);

  test('resolves choices to the titles of the schema the answers were filed against', () => {
    expect(textOf(sections, 'operation', 'focus')).toBe('Restaurang');
    expect(textOf(sections, 'operation', 'serving-to')).toBe('Enbart till allmänheten');
    expect(textOf(sections, 'serving', 'drinks')).toBe('Starköl, Vin');
    expect(textOf(sections, 'financing', 'sources')).toBe('Egna medel, Banklån');
    expect(textOf(sections, 'premises', 'cooperation-agreement')).toBe('Nej');
  });

  test('a question written in the form is HTML; one answered with an upload points at the attachment', () => {
    expect(row(sections, 'operation', 'description')?.cell).toEqual({
      kind: 'html',
      html: '<p>Havsnära restaurang</p>',
    });
    expect(row(sections, 'serving', 'menu')?.cell).toEqual({ kind: 'html', html: '<p>Toast skagen</p>' });

    const uploaded = buildDecisionBasisSections({ ...ANSWERS, menuChoice: 'UPLOAD' }, PERMANENT);
    expect(row(uploaded, 'serving', 'menu')?.cell).toEqual({ kind: 'attachment', purpose: 'MENU' });
  });

  test('serving hours follow the audience, with plain labels when there is only one', () => {
    const hours = section(sections, 'serving_hours');
    expect(hours.rows.map((candidate) => candidate.key)).toEqual(['period-public', 'indoor-public', 'outdoor-public']);
    expect(hours.rows.map((candidate) => candidate.labelKey)).toEqual([
      'common:decision.basis.serving_hours.period',
      'common:decision.basis.serving_hours.indoor',
      'common:decision.basis.serving_hours.outdoor',
    ]);
    expect(textOf(sections, 'serving_hours', 'period-public')).toBe('Året runt');
    expect(textOf(sections, 'serving_hours', 'indoor-public')).toBe('11:00–01:00');
    expect(textOf(sections, 'serving_hours', 'outdoor-public')).toBe('11:00–23:00');
  });

  test('both audiences give two groups, each labelled with its audience and its period dates', () => {
    const both = buildDecisionBasisSections(
      {
        ...ANSWERS,
        servingAudience: 'PUBLIC_AND_CLOSED_COMPANY',
        closedCompanyServingPeriod: 'ANNUAL_PERIOD',
        closedCompanyServingPeriodDates: { fromDate: '2026-05-01', toDate: '2026-09-30' },
        closedCompanyServingHoursIndoor: { from: '18:00', to: '02:00' },
      },
      PERMANENT
    );
    const hours = section(both, 'serving_hours');

    expect(hours.rows.map((candidate) => candidate.key)).toEqual([
      'period-public',
      'indoor-public',
      'outdoor-public',
      'period-private',
      'indoor-private',
      'outdoor-private',
    ]);
    expect(row(both, 'serving_hours', 'indoor-private')?.labelKey).toBe(
      'common:decision.basis.serving_hours.indoor_private'
    );
    expect(textOf(both, 'serving_hours', 'period-private')).toBe('Årligen under viss period, 2026-05-01 – 2026-09-30');
    // Asked, but hidden by the form since no outdoor hours were given for the closed company.
    expect(row(both, 'serving_hours', 'outdoor-private')?.cell).toBeUndefined();
  });

  test('tables take their columns from the schema and their rows from the answers', () => {
    expect(row(sections, 'financing', 'own-funds')?.cell).toEqual({
      kind: 'table',
      columns: ['Bank', 'Kontonummer', 'Belopp (kronor)'],
      rows: [['Swedbank', '8327-9 412 663 1', '600000']],
    });
    expect(row(sections, 'financing', 'bank-loan')?.cell).toEqual({
      kind: 'table',
      columns: ['Långivare', 'Belopp (kronor)'],
      rows: [['Sundsvalls Sparbank', '1200000']],
    });
  });

  test('the premises rows join the contact details', () => {
    expect(textOf(sections, 'premises', 'name')).toBe('Kustbryggan');
    expect(textOf(sections, 'premises', 'contact')).toBe('060-15 40 20, info@kustbryggan.se');
  });

  test('the serving premises point at the drawings the schema asks for and read the counts out of their objects', () => {
    expect(row(sections, 'serving_premises', 'drawing')?.cell).toEqual({ kind: 'attachment', purpose: 'FLOOR_PLAN' });
    // Only the catering schema asks for a kitchen drawing.
    expect(row(sections, 'serving_premises', 'kitchen-drawing')).toBeUndefined();
  });

  test('a drawing a handler attached by hand is shown although the schema never asked for it', () => {
    const uploaded = buildDecisionBasisSections(ANSWERS, PERMANENT, ['KITCHEN_FLOOR_PLAN', 'MENU']);

    expect(row(uploaded, 'serving_premises', 'kitchen-drawing')?.cell).toEqual({
      kind: 'attachment',
      purpose: 'KITCHEN_FLOOR_PLAN',
    });
    expect(row(uploaded, 'serving_premises', 'drawing')?.cell).toEqual({ kind: 'attachment', purpose: 'FLOOR_PLAN' });
    expect(textOf(sections, 'serving_premises', 'seats')).toBe('72');
    expect(textOf(sections, 'serving_premises', 'max-persons')).toBe('110');
    // The schema asks about an outdoor area; the applicant left it empty.
    expect(row(sections, 'serving_premises', 'outdoor-seats')?.cell).toBeUndefined();
  });

  test('a question the errand type never asks has no row; one it asks but the form hid shows nothing', () => {
    expect(row(sections, 'operation', 'hotel-service')).toBeUndefined();
    expect(section(sections, 'event').rows).toEqual([]);
    expect(section(sections, 'production').rows).toEqual([]);

    const hotel = buildDecisionBasisSections(ANSWERS, {
      ...PERMANENT,
      properties: {
        ...PERMANENT.properties,
        additionalScopes: { type: 'array', items: { type: 'string', oneOf: [] } },
      },
    });
    expect(row(hotel, 'operation', 'hotel-service')).toEqual({
      key: 'hotel-service',
      labelKey: 'common:decision.basis.operation.hotel_service',
      labelText: undefined,
      cell: undefined,
    });
  });

  test('the tobacco website at the root joins the contact row, and the seats row needs the schema to ask', () => {
    const tobacco = buildDecisionBasisSections(
      {
        pointOfSaleName: 'Kiosken',
        pointOfSaleContact: { phoneNumber: '060-1', emailAddress: 'kiosk@example.com' },
        includesDistanceSelling: 'YES',
        distanceSellingWebsite: 'https://kiosken.example',
        seating: { seatsIndoor: '4' },
      },
      {
        type: 'object',
        properties: {
          pointOfSaleName: { type: 'string' },
          pointOfSaleContact: { type: 'object', properties: {} },
          includesDistanceSelling: yesNo,
          distanceSellingWebsite: { type: 'string' },
          seating: { type: 'object', properties: { seatsIndoor: { type: 'string' } } },
        },
      }
    );

    expect(textOf(tobacco, 'premises', 'name')).toBe('Kiosken');
    expect(textOf(tobacco, 'premises', 'contact')).toBe('060-1, kiosk@example.com, https://kiosken.example');
    expect(textOf(tobacco, 'operation', 'distance-sales')).toBe('Ja');
    expect(row(tobacco, 'serving_premises', 'seats')?.cell).toEqual({ kind: 'text', text: '4' });
    expect(row(tobacco, 'serving_premises', 'outdoor-seats')).toBeUndefined();
    expect(row(tobacco, 'serving_premises', 'drawing')).toBeUndefined();
  });

  test('without the schema the answers are still shown, constants and all', () => {
    const bare = buildDecisionBasisSections(ANSWERS, null);

    expect(textOf(bare, 'operation', 'focus')).toBe('RESTAURANT');
    expect(textOf(bare, 'serving', 'drinks')).toBe('STRONG_BEER, WINE');
    expect(row(bare, 'financing', 'own-funds')?.cell).toEqual({
      kind: 'table',
      columns: ['bank', 'accountNumber', 'amountSek'],
      rows: [['Swedbank', '8327-9 412 663 1', '600000']],
    });
    expect(row(bare, 'serving_premises', 'outdoor-seats')).toBeUndefined();
    // Which uploads were asked for is only known from the schema, unless one has been attached.
    expect(row(bare, 'serving_premises', 'drawing')).toBeUndefined();
    expect(row(buildDecisionBasisSections(ANSWERS, null, ['FLOOR_PLAN']), 'serving_premises', 'drawing')?.cell).toEqual(
      { kind: 'attachment', purpose: 'FLOOR_PLAN' }
    );
  });
});
