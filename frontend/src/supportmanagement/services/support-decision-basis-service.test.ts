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
    { const: 'JA', title: 'Ja' },
    { const: 'NEJ', title: 'Nej' },
  ],
};
const timeRange: RJSFSchema = {
  type: 'object',
  properties: { startTime: { type: 'string' }, endTime: { type: 'string' } },
};
const dateRange: RJSFSchema = {
  type: 'object',
  properties: { startDate: { type: 'string' }, endDate: { type: 'string' } },
};
const period: RJSFSchema = {
  type: 'string',
  oneOf: [
    { const: 'ARET_RUNT', title: 'Året runt' },
    { const: 'ARLIGEN_UNDER_VISS_PERIOD', title: 'Årligen under viss period' },
  ],
};

/** The permanent serving schema, cut down to the questions the sections read. */
const PERMANENT: RJSFSchema = {
  type: 'object',
  properties: {
    verksamhetsbeskrivningsval: {
      type: 'string',
      oneOf: [
        { const: 'JAG_VILL_SKRIVA_VERKSAMHETSBESKRIVNINGEN_I', title: 'Skriva' },
        { const: 'JAG_VILL_BIFOGA_VERKSAMHETSBESKRIVNINGEN_SOM', title: 'Bifoga' },
      ],
    },
    verksamhetsbeskrivning: { type: 'string' },
    verksamhetensInriktning: {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'RESTAURANG', title: 'Restaurang' },
          { const: 'HOTELL', title: 'Hotell' },
        ],
      },
    },
    serveringTillAllmanhetenEllerSlutetSallskap: {
      type: 'string',
      oneOf: [
        { const: 'ENBART_TILL_ALLMANHETEN', title: 'Enbart till allmänheten' },
        { const: 'ENBART_TILL_SLUTET_SALLSKAP', title: 'Enbart till slutet sällskap' },
        { const: 'BADE_TILL_ALLMANHETEN_OCH_TILL', title: 'Både och' },
      ],
    },
    serveringsperiodForAllmanheten: period,
    periodServeringAllmanheten: dateRange,
    serveringstiderInomhusAllmanheten: timeRange,
    serveringstiderUtomhusAllmanheten: timeRange,
    serveringsperiodForSlutetSallskap: period,
    periodServeringSlutetSallskap: dateRange,
    serveringstiderInomhusSlutetSallskap: timeRange,
    serveringstiderUtomhusSlutetSallskap: timeRange,
    alkoholdrycker: {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'STARKOL', title: 'Starköl' },
          { const: 'VIN', title: 'Vin' },
        ],
      },
    },
    menyval: {
      type: 'string',
      oneOf: [
        { const: 'JAG_VILL_BESKRIVA', title: 'Beskriva' },
        { const: 'JAG_VILL_LADDA_UPP', title: 'Ladda upp' },
      ],
    },
    menyBeskrivning: { type: 'string' },
    finansiering: {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'EGNA_MEDEL', title: 'Egna medel' },
          { const: 'BANKLAN', title: 'Banklån' },
        ],
      },
    },
    egnaMedel: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bank: { type: 'string', title: 'Bank' },
          kontonummer: { type: 'string', title: 'Kontonummer' },
          beloppKronor: { type: 'string', title: 'Belopp (kronor)' },
        },
      },
    },
    banklan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          langivare: { type: 'string', title: 'Långivare' },
          beloppKronor: { type: 'string', title: 'Belopp (kronor)' },
        },
      },
    },
    serveringsstalletsNamn: { type: 'string', title: 'Serveringsställets namn' },
    kontaktuppgifterTillServeringsstallet: {
      type: 'object',
      properties: { telefonnummer: { type: 'string' }, ePostadress: { type: 'string' }, hemsida: { type: 'string' } },
    },
    sittplatserILokalen: {
      type: 'object',
      properties: { antalSittplatserInomhus: { type: 'string' }, antalSittplatserUteservering: { type: 'string' } },
    },
    maximaltAntalPersonerILokalen: { type: 'object', properties: { antalPersoner: { type: 'string' } } },
    harSamarbetsavtal: yesNo,
  },
  'x-attachments': [{ key: 'FLOOR_PLAN', label: 'Planritning' }],
};

const ANSWERS: FormValue = {
  verksamhetsbeskrivningsval: 'JAG_VILL_SKRIVA_VERKSAMHETSBESKRIVNINGEN_I',
  verksamhetsbeskrivning: '<p>Havsnära restaurang</p>',
  verksamhetensInriktning: ['RESTAURANG'],
  serveringTillAllmanhetenEllerSlutetSallskap: 'ENBART_TILL_ALLMANHETEN',
  serveringsperiodForAllmanheten: 'ARET_RUNT',
  serveringstiderInomhusAllmanheten: { startTime: '11:00:00', endTime: '01:00+01:00' },
  serveringstiderUtomhusAllmanheten: { startTime: '11:00', endTime: '23:00' },
  alkoholdrycker: ['STARKOL', 'VIN'],
  menyval: 'JAG_VILL_BESKRIVA',
  menyBeskrivning: '<p>Toast skagen</p>',
  finansiering: ['EGNA_MEDEL', 'BANKLAN'],
  egnaMedel: [{ bank: 'Swedbank', kontonummer: '8327-9 412 663 1', beloppKronor: '600000' }],
  banklan: [{ langivare: 'Sundsvalls Sparbank', beloppKronor: '1200000' }],
  serveringsstalletsNamn: 'Kustbryggan',
  kontaktuppgifterTillServeringsstallet: { telefonnummer: '060-15 40 20', ePostadress: 'info@kustbryggan.se' },
  sittplatserILokalen: { antalSittplatserInomhus: '72' },
  maximaltAntalPersonerILokalen: { antalPersoner: '110' },
  harSamarbetsavtal: 'NEJ',
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
        value: { serveringsstalletsNamn: 'Kiosken' },
      },
    ],
  } as unknown as Pick<SupportErrand, 'labels' | 'classification' | 'jsonParameters'>;

  test('picks the answers filed under the schema name of the errand type', () => {
    expect(getDecisionBasisForm(errand, 'AOT')).toEqual({
      schemaId: 'folkol-id',
      value: { serveringsstalletsNamn: 'Kiosken' },
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

    const uploaded = buildDecisionBasisSections({ ...ANSWERS, menyval: 'JAG_VILL_LADDA_UPP' }, PERMANENT);
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
        serveringTillAllmanhetenEllerSlutetSallskap: 'BADE_TILL_ALLMANHETEN_OCH_TILL',
        serveringsperiodForSlutetSallskap: 'ARLIGEN_UNDER_VISS_PERIOD',
        periodServeringSlutetSallskap: { startDate: '2026-05-01', endDate: '2026-09-30' },
        serveringstiderInomhusSlutetSallskap: { startTime: '18:00', endTime: '02:00' },
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
      properties: { ...PERMANENT.properties, harNi: { type: 'array', items: { type: 'string', oneOf: [] } } },
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
        serveringsstalletsNamn: 'Kiosken',
        kontaktuppgifterTillServeringsstallet: { telefonnummer: '060-1', ePostadress: 'kiosk@example.com' },
        bedriverAvenDistansforsaljning: 'JA',
        hemsida: 'https://kiosken.example',
        sittplatserILokalen: { antalSittplatserInomhus: '4' },
      },
      {
        type: 'object',
        properties: {
          serveringsstalletsNamn: { type: 'string' },
          kontaktuppgifterTillServeringsstallet: { type: 'object', properties: {} },
          bedriverAvenDistansforsaljning: yesNo,
          hemsida: { type: 'string' },
          sittplatserILokalen: { type: 'object', properties: { antalSittplatserInomhus: { type: 'string' } } },
        },
      }
    );

    expect(textOf(tobacco, 'premises', 'contact')).toBe('060-1, kiosk@example.com, https://kiosken.example');
    expect(textOf(tobacco, 'operation', 'distance-sales')).toBe('Ja');
    expect(row(tobacco, 'serving_premises', 'seats')?.cell).toEqual({ kind: 'text', text: '4' });
    expect(row(tobacco, 'serving_premises', 'outdoor-seats')).toBeUndefined();
    expect(row(tobacco, 'serving_premises', 'drawing')).toBeUndefined();
  });

  test('without the schema the answers are still shown, constants and all', () => {
    const bare = buildDecisionBasisSections(ANSWERS, null);

    expect(textOf(bare, 'operation', 'focus')).toBe('RESTAURANG');
    expect(textOf(bare, 'serving', 'drinks')).toBe('STARKOL, VIN');
    expect(row(bare, 'financing', 'own-funds')?.cell).toEqual({
      kind: 'table',
      columns: ['bank', 'kontonummer', 'beloppKronor'],
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
