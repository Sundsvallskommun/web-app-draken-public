import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test } from 'vitest';

import type { SupportMetadata } from './support-metadata-service';
import {
  supportPremisesCapacity,
  supportPremisesExamination,
  supportPremisesFireSafety,
  withSupportPremisesExamination,
} from './support-premises-examination-service';

const NAMESPACE = 'AOT';
const PERMANENT_SERVING = 'aot_alcohol_serving_permit_application_permanent_serving';

const errand = (formData: Record<string, unknown> | undefined) => {
  const [category, ...type] = PERMANENT_SERVING.replace(/^aot_/, '').split('_');
  return {
    labels: [
      { classification: 'CATEGORY', resourceName: category.toUpperCase() },
      { classification: 'TYPE', resourceName: type.join('_').toUpperCase() },
    ],
    jsonParameters: formData ? [{ key: PERMANENT_SERVING, value: formData, schemaId: `${PERMANENT_SERVING}-id` }] : [],
  };
};

const metadata = {
  statementOutcomes: [
    { name: 'APPROVED_WITH_CONDITIONS', displayName: 'Godkänd med villkor' },
    { name: 'NO_RESPONSE', displayName: 'Inget svar inom fristen', responded: false },
  ],
} as SupportMetadata;

const rescueService = (statement: Partial<Statement>): Statement => ({
  counterpartyName: 'Medelpads Räddningstjänstförbund',
  status: 'COMPLETED',
  ...statement,
});

describe('capacity read from the application', () => {
  test('reads seats and the highest number of people', () => {
    const answers = {
      seating: { seatsIndoor: '50', seatsOutdoor: '10' },
      maxPersonsInPremises: { maxPersons: '50' },
    };

    expect(supportPremisesCapacity(errand(answers), NAMESPACE)).toEqual({
      indoorSeats: '50',
      outdoorSeats: '10',
      maxPersons: '50',
    });
  });

  test('reads the outdoor count under the name an older schema gave it', () => {
    const answers = { seating: { seatsOutdoor: '10' } };

    expect(supportPremisesCapacity(errand(answers), NAMESPACE).outdoorSeats).toBe('10');
  });

  test('an unanswered question is no value, not an empty string', () => {
    expect(supportPremisesCapacity(errand({ seating: { seatsIndoor: '50' } }), NAMESPACE)).toEqual({
      indoorSeats: '50',
      outdoorSeats: undefined,
      maxPersons: undefined,
    });
  });

  test('an errand without answers reads as nothing at all', () => {
    expect(supportPremisesCapacity(errand(undefined), NAMESPACE)).toEqual({});
    expect(supportPremisesCapacity(errand({}), undefined)).toEqual({});
  });
});

describe('fire safety read from the rescue service referral', () => {
  test('shows the outcome under its display name, with the counterparty', () => {
    const statements = [
      rescueService({ outcome: 'APPROVED_WITH_CONDITIONS', respondedAt: '2026-04-10T00:00:00+02:00' }),
    ];

    expect(supportPremisesFireSafety(statements, metadata)).toEqual({
      counterparty: 'Medelpads Räddningstjänstförbund',
      outcome: 'Godkänd med villkor',
      respondedAt: '2026-04-10',
    });
  });

  test('an answer without a date has no date, rather than today', () => {
    expect(supportPremisesFireSafety([rescueService({ outcome: 'APPROVED' })], metadata)?.respondedAt).toBeUndefined();
    expect(
      supportPremisesFireSafety([rescueService({ outcome: 'APPROVED', respondedAt: 'not a date' })], metadata)
        ?.respondedAt
    ).toBeUndefined();
  });

  test('an outcome the metadata does not name is shown as it is stored', () => {
    const statements = [rescueService({ outcome: 'SOMETHING_NEW' })];

    expect(supportPremisesFireSafety(statements, metadata)?.outcome).toBe('SOMETHING_NEW');
  });

  test('the latest answer counts when the referral was sent twice', () => {
    const statements = [
      rescueService({ outcome: 'NO_RESPONSE', respondedAt: '2026-03-01T00:00:00+01:00' }),
      rescueService({ outcome: 'APPROVED_WITH_CONDITIONS', respondedAt: '2026-04-10T00:00:00+02:00' }),
    ];

    expect(supportPremisesFireSafety(statements, metadata)?.outcome).toBe('Godkänd med villkor');
  });

  test('another counterparty is not the fire safety, and neither is a referral without an outcome', () => {
    expect(
      supportPremisesFireSafety([{ counterpartyName: 'Polismyndigheten', outcome: 'APPROVED' }], metadata)
    ).toBeUndefined();
    expect(supportPremisesFireSafety([rescueService({})], metadata)).toBeUndefined();
    expect(supportPremisesFireSafety([], metadata)).toBeUndefined();
  });
});

describe('what the handler establishes, kept in the section JSON', () => {
  const json = {
    inspectedAt: '2026-04-10',
    rightOfDisposal: { status: 'PROVEN', note: 'hyresavtal t.o.m. 2029' },
  };

  test('reads what has been written', () => {
    expect(supportPremisesExamination(json)).toEqual({
      inspectedAt: '2026-04-10',
      rightOfDisposal: 'PROVEN',
      rightOfDisposalNote: 'hyresavtal t.o.m. 2029',
      servingArea: '',
      previousBusiness: '',
    });
  });

  test('nothing written reads as empty fields', () => {
    expect(supportPremisesExamination(undefined)).toEqual({
      inspectedAt: '',
      rightOfDisposal: '',
      rightOfDisposalNote: '',
      servingArea: '',
      previousBusiness: '',
    });
  });

  test('a write changes its own field and leaves the others alone', () => {
    const written = withSupportPremisesExamination(json, 'rightOfDisposal', 'PENDING');

    expect(written).toEqual({
      inspectedAt: '2026-04-10',
      rightOfDisposal: { status: 'PENDING', note: 'hyresavtal t.o.m. 2029' },
    });
  });

  test('a note keeps the space the handler typed', () => {
    const written = withSupportPremisesExamination(json, 'rightOfDisposalNote', 'hyresavtal t.o.m. ');

    expect(supportPremisesExamination(written).rightOfDisposalNote).toBe('hyresavtal t.o.m. ');
  });

  test('clearing a field leaves it out instead of storing a blank', () => {
    const written = withSupportPremisesExamination(json, 'inspectedAt', '');

    expect(written).not.toHaveProperty('inspectedAt');
  });

  test('the serving areas are written as the serving area description', () => {
    const written = withSupportPremisesExamination(undefined, 'servingArea', 'Matsalen och bryggan');

    expect(written).toEqual({ servingArea: { description: 'Matsalen och bryggan' } });
  });
});
