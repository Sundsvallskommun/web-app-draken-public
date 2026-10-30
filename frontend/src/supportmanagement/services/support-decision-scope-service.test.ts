import { describe, expect, test } from 'vitest';

import {
  BEVERAGES_KEY,
  DECIDED_GROUP,
  decidesBeverages,
  hasInvalidServingHours,
  resolveScope,
  scopeFromDecision,
  scopeFromForm,
  servingHoursSlotsFor,
  servingHoursText,
  toScopeParameters,
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

  test('a saved key wins over the application, even when it is empty', () => {
    const saved = scopeFromDecision(
      [
        { key: BEVERAGES_KEY, values: [] },
        { key: 'decidedServingHoursIndoorPublic', values: ['10:00', '00:00'] },
        { key: 'decidedServingHoursOutdoorPublic', values: [] },
      ],
      slots
    );

    expect(resolveScope(saved, defaults, slots)).toEqual({
      beverages: [],
      servingHours: {
        indoorPublic: { from: '10:00', to: '00:00' },
        outdoorPublic: { from: '', to: '' },
        indoorPrivate: { from: '18:00', to: '' },
        outdoorPrivate: { from: '', to: '' },
      },
    });
  });

  test('a decision without the keys falls back to the application', () => {
    expect(resolveScope(scopeFromDecision(undefined, slots), defaults, slots)).toEqual(defaults);
    expect(resolveScope(scopeFromDecision([{ key: 'premisesName', values: ['x'] }], slots), defaults, slots)).toEqual(
      defaults
    );
  });

  test('every shown slot is written, with both ends or none, under the DECIDED group with a display name', () => {
    const written = toScopeParameters(defaults, slots, 'SERVERINGSTILLSTAND', (key) => `label:${key}`);

    expect(written).toEqual([
      {
        key: BEVERAGES_KEY,
        displayName: 'label:common:decision.scope.beverages.label',
        group: DECIDED_GROUP,
        values: ['STRONG_BEER', 'WINE'],
      },
      {
        key: 'decidedServingHoursIndoorPublic',
        displayName: 'label:common:decision.scope.serving_hours.indoor_public',
        group: DECIDED_GROUP,
        values: ['11:00', '01:00'],
      },
      {
        key: 'decidedServingHoursOutdoorPublic',
        displayName: 'label:common:decision.scope.serving_hours.outdoor_public',
        group: DECIDED_GROUP,
        values: ['11:00', '23:00'],
      },
      {
        key: 'decidedServingHoursIndoorPrivate',
        displayName: 'label:common:decision.scope.serving_hours.indoor_private',
        group: DECIDED_GROUP,
        values: [],
      },
      {
        key: 'decidedServingHoursOutdoorPrivate',
        displayName: 'label:common:decision.scope.serving_hours.outdoor_private',
        group: DECIDED_GROUP,
        values: [],
      },
    ]);
    // Nothing blank is ever sent: Support Management rejects it.
    expect(written.flatMap((parameter) => parameter.values ?? [])).not.toContain('');
  });

  test('a permit that does not decide beverages writes only its hours', () => {
    const farmSlots = servingHoursSlotsFor('FARM_SALES', undefined);
    const written = toScopeParameters(
      { beverages: ['WINE'], servingHours: { single: { from: '10:00', to: '18:00' } } },
      farmSlots,
      'TOBAKSFORSALJNING',
      (key) => key
    );

    expect(written.map((parameter) => parameter.key)).toEqual(['decidedServingHours']);
  });

  test('what was written reads back as it was', () => {
    const written = toScopeParameters(defaults, slots, 'SERVERINGSTILLSTAND', (key) => key);
    const readBack = resolveScope(scopeFromDecision(written, slots), { beverages: [], servingHours: {} }, slots);

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
