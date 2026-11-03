import { describe, expect, test } from 'vitest';

import {
  decidesBeverages,
  hasInvalidServingHours,
  resolveScope,
  scopeFromDecision,
  scopeFromForm,
  servingHoursSlotsFor,
  servingHoursText,
  toScopeJson,
} from './support-decision-scope-service';

const PERMANENT = 'PERMANENT_SERVING';
const slotNames = (errandType: string | undefined, form?: Record<string, unknown>) =>
  servingHoursSlotsFor(errandType, form).map((spec) => spec.slot);

const permanentForm = {
  servingAudience: 'PUBLIC_AND_CLOSED_COMPANY',
  publicServingHoursIndoor: { from: '11:00:00', to: '01:00:00' },
  publicServingHoursOutdoor: { from: '11:00', to: '23:00' },
  closedCompanyServingHoursIndoor: { from: '18:00' },
  beverages: ['STRONG_BEER', 'WINE'],
};

describe('which slots an errand type gets', () => {
  test('permanent serving gets a slot per audience applied for, indoors and outdoors', () => {
    expect(slotNames(PERMANENT, permanentForm)).toEqual([
      'indoorPublic',
      'outdoorPublic',
      'indoorPrivate',
      'outdoorPrivate',
    ]);
    expect(slotNames(PERMANENT, { servingAudience: 'PUBLIC' })).toEqual(['indoorPublic', 'outdoorPublic']);
    expect(slotNames(PERMANENT, { servingAudience: 'CLOSED_COMPANY' })).toEqual(['indoorPrivate', 'outdoorPrivate']);
  });

  test('without an application every slot of the type is offered', () => {
    expect(slotNames(PERMANENT)).toHaveLength(4);
    expect(slotNames(PERMANENT, {})).toEqual([]);
  });

  test('temporary serving and farm sales get one slot; the rest none', () => {
    expect(slotNames('TEMPORARY_SERVING_PUBLIC')).toEqual(['single']);
    expect(slotNames('TEMPORARY_SERVING_PRIVATE')).toEqual(['single']);
    expect(slotNames('FARM_SALES')).toEqual(['single']);
    expect(slotNames('PERMANENT_CATERING')).toEqual([]);
    expect(slotNames('TASTING')).toEqual([]);
    expect(slotNames('SALES_PERMIT_APPLICATION')).toEqual([]);
    expect(slotNames(undefined)).toEqual([]);
  });

  test('beverages are decided on serving permits only', () => {
    expect(decidesBeverages('SERVERINGSTILLSTAND')).toBe(true);
    expect(decidesBeverages('TOBAKSFORSALJNING')).toBe(false);
    expect(decidesBeverages('FOLKOLSANMALAN')).toBe(false);
  });
});

describe('the application as the starting point', () => {
  test('reads the beverages and the hours as HH:mm, blank where an end is missing', () => {
    const slots = servingHoursSlotsFor(PERMANENT, permanentForm);

    expect(scopeFromForm(permanentForm, PERMANENT, slots)).toEqual({
      beverages: ['STRONG_BEER', 'WINE'],
      servingHours: {
        indoorPublic: { from: '11:00', to: '01:00' },
        outdoorPublic: { from: '11:00', to: '23:00' },
        indoorPrivate: { from: '18:00', to: '' },
        outdoorPrivate: { from: '', to: '' },
      },
    });
  });

  test('the single slot reads the field of its errand type', () => {
    const temporary = { dailyServingHours: { from: '12:00', to: '22:00' } };
    const farm = { salesHours: { from: '10:00', to: '18:00' } };

    expect(
      scopeFromForm(temporary, 'TEMPORARY_SERVING_PUBLIC', servingHoursSlotsFor('TEMPORARY_SERVING_PUBLIC', temporary))
        .servingHours.single
    ).toEqual({ from: '12:00', to: '22:00' });
    expect(scopeFromForm(farm, 'FARM_SALES', servingHoursSlotsFor('FARM_SALES', farm)).servingHours.single).toEqual({
      from: '10:00',
      to: '18:00',
    });
  });

  test('without an application everything starts empty', () => {
    expect(scopeFromForm(undefined, PERMANENT, servingHoursSlotsFor(PERMANENT, undefined))).toEqual({
      beverages: [],
      servingHours: {
        indoorPublic: { from: '', to: '' },
        outdoorPublic: { from: '', to: '' },
        indoorPrivate: { from: '', to: '' },
        outdoorPrivate: { from: '', to: '' },
      },
    });
  });
});

describe('what the decision carries', () => {
  const slots = servingHoursSlotsFor(PERMANENT, permanentForm);
  const defaults = scopeFromForm(permanentForm, PERMANENT, slots);

  test('a saved list wins over the application, even when it is empty, and a slot it lacks has no hours', () => {
    const saved = scopeFromDecision({
      beverages: [],
      servingHours: [{ audience: 'PUBLIC', location: 'INDOOR', from: '10:00', to: '00:00' }],
    });

    expect(resolveScope(saved, defaults, slots)).toEqual({
      beverages: [],
      servingHours: {
        indoorPublic: { from: '10:00', to: '00:00' },
        outdoorPublic: { from: '', to: '' },
        indoorPrivate: { from: '', to: '' },
        outdoorPrivate: { from: '', to: '' },
      },
    });
  });

  test('a decision without the lists falls back to the application', () => {
    expect(resolveScope(scopeFromDecision(undefined), defaults, slots)).toEqual(defaults);
    expect(resolveScope(scopeFromDecision({ premises: { name: 'x' } }), defaults, slots)).toEqual(defaults);
  });

  test('the hours are written as the permit has them, a slot without both ends left out', () => {
    expect(toScopeJson(defaults, 'SERVERINGSTILLSTAND')).toEqual({
      beverages: ['STRONG_BEER', 'WINE'],
      servingHours: [
        { audience: 'PUBLIC', location: 'INDOOR', from: '11:00', to: '01:00' },
        { audience: 'PUBLIC', location: 'OUTDOOR', from: '11:00', to: '23:00' },
      ],
    });
  });

  test('a permit that does not decide beverages writes only its hours, a single slot with no place', () => {
    expect(
      toScopeJson(
        { beverages: ['WINE'], servingHours: { single: { from: '10:00', to: '18:00' } } },
        'TOBAKSFORSALJNING'
      )
    ).toEqual({ beverages: undefined, servingHours: [{ from: '10:00', to: '18:00' }] });
  });

  test('what was written reads back as it was', () => {
    const readBack = resolveScope(
      scopeFromDecision(toScopeJson(defaults, 'SERVERINGSTILLSTAND')),
      { beverages: [], servingHours: {} },
      slots
    );

    expect(readBack).toEqual({
      ...defaults,
      // The half-filled range was not a decision and is read back as empty.
      servingHours: { ...defaults.servingHours, indoorPrivate: { from: '', to: '' } },
    });
  });
});

describe('validity and text', () => {
  test('a range with one end only is invalid, with both or none it is not', () => {
    expect(hasInvalidServingHours({ beverages: [], servingHours: { single: { from: '10:00', to: '' } } })).toBe(true);
    expect(hasInvalidServingHours({ beverages: [], servingHours: { single: { from: '', to: '18:00' } } })).toBe(true);
    expect(hasInvalidServingHours({ beverages: [], servingHours: { single: { from: '', to: '' } } })).toBe(false);
    expect(hasInvalidServingHours({ beverages: [], servingHours: { single: { from: '10:00', to: '18:00' } } })).toBe(
      false
    );
    expect(hasInvalidServingHours({ beverages: [], servingHours: {} })).toBe(false);
  });

  test('a complete range reads as the certificate shows it', () => {
    expect(servingHoursText({ from: '11:00', to: '01:00' })).toBe('11:00–01:00');
    expect(servingHoursText({ from: '11:00', to: '' })).toBeUndefined();
    expect(servingHoursText(undefined)).toBeUndefined();
  });
});
