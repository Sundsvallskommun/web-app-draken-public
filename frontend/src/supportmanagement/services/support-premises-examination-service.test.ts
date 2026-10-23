import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import type { CParameter } from 'src/data-contracts/backend/data-contracts';
import { describe, expect, test } from 'vitest';

import type { SupportMetadata } from './support-metadata-service';
import {
  emptySupportPremisesPreviousPermit,
  supportPremisesCapacity,
  supportPremisesExamination,
  supportPremisesFireSafety,
  supportPremisesPreviousPermits,
  withSupportPremisesExamination,
  withSupportPremisesPreviousPermits,
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
      sittplatserILokalen: { antalSittplatserInomhus: '50', antalSittplatserPaEventuellUteserver: '10' },
      maximaltAntalPersonerILokalen: { antalPersoner: '50' },
    };

    expect(supportPremisesCapacity(errand(answers), NAMESPACE)).toEqual({
      indoorSeats: '50',
      outdoorSeats: '10',
      maxPersons: '50',
    });
  });

  test('reads the outdoor count under the name an older schema gave it', () => {
    const answers = { sittplatserILokalen: { antalSittplatserUteservering: '10' } };

    expect(supportPremisesCapacity(errand(answers), NAMESPACE).outdoorSeats).toBe('10');
  });

  test('an unanswered question is no value, not an empty string', () => {
    expect(
      supportPremisesCapacity(errand({ sittplatserILokalen: { antalSittplatserInomhus: '50' } }), NAMESPACE)
    ).toEqual({ indoorSeats: '50', outdoorSeats: undefined, maxPersons: undefined });
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

describe('what the handler establishes, kept on the errand', () => {
  const parameters: CParameter[] = [
    { key: 'object', values: ['Testgatan 1'] },
    { key: 'PREMISES_INSPECTED_AT', values: ['2026-04-10'] },
    { key: 'PREMISES_RIGHT_OF_DISPOSAL', values: ['PROVEN'] },
    { key: 'PREMISES_RIGHT_OF_DISPOSAL_NOTE', values: ['hyresavtal t.o.m. 2029'] },
  ];

  test('reads what has been written', () => {
    expect(supportPremisesExamination(parameters)).toEqual({
      inspectedAt: '2026-04-10',
      rightOfDisposal: 'PROVEN',
      rightOfDisposalNote: 'hyresavtal t.o.m. 2029',
      restaurantNumber: '',
      servingArea: '',
    });
  });

  test('nothing written reads as empty fields', () => {
    expect(supportPremisesExamination(undefined)).toEqual({
      inspectedAt: '',
      rightOfDisposal: '',
      rightOfDisposalNote: '',
      restaurantNumber: '',
      servingArea: '',
    });
  });

  test('a write replaces its own parameter and leaves the others alone', () => {
    const written = withSupportPremisesExamination(parameters, 'rightOfDisposal', 'PENDING');

    expect(supportPremisesExamination(written).rightOfDisposal).toBe('PENDING');
    expect(supportPremisesExamination(written).rightOfDisposalNote).toBe('hyresavtal t.o.m. 2029');
    expect(written.find((parameter) => parameter.key === 'object')?.values).toEqual(['Testgatan 1']);
  });

  test('a note keeps the space the handler typed', () => {
    const written = withSupportPremisesExamination(parameters, 'rightOfDisposalNote', 'hyresavtal t.o.m. ');

    expect(supportPremisesExamination(written).rightOfDisposalNote).toBe('hyresavtal t.o.m. ');
  });

  test('clearing a field removes the parameter instead of storing a blank', () => {
    const written = withSupportPremisesExamination(parameters, 'inspectedAt', '');

    expect(written.some((parameter) => parameter.key === 'PREMISES_INSPECTED_AT')).toBe(false);
  });
});

describe('what the handler establishes for the underlay', () => {
  test('the restaurant number and the serving areas are written onto the errand', () => {
    const withNumber = withSupportPremisesExamination([], 'restaurantNumber', '2262-0112');
    const written = withSupportPremisesExamination(withNumber, 'servingArea', 'Matsalen och bryggan');

    expect(supportPremisesExamination(written).restaurantNumber).toBe('2262-0112');
    expect(supportPremisesExamination(written).servingArea).toBe('Matsalen och bryggan');
  });

  test('the permits the premises has had are written as a row each, and read back in order', () => {
    const written = withSupportPremisesPreviousPermits(
      [{ key: 'object', values: ['Testgatan 1'] }],
      [
        { holderName: 'Tynderö Sjökrog AB', validFrom: '2019-05-01', validTo: '2023-09-30' },
        { holderName: 'Bryggan i Söråker HB', validFrom: '2024-05-15', validTo: '2025-09-30' },
      ]
    );

    expect(supportPremisesPreviousPermits(written)).toEqual([
      { holderName: 'Tynderö Sjökrog AB', validFrom: '2019-05-01', validTo: '2023-09-30' },
      { holderName: 'Bryggan i Söråker HB', validFrom: '2024-05-15', validTo: '2025-09-30' },
    ]);
    expect(written.find((parameter) => parameter.key === 'object')?.values).toEqual(['Testgatan 1']);
  });

  test('a row opened but not filled in is still there when the errand is read back', () => {
    const written = withSupportPremisesPreviousPermits([], [emptySupportPremisesPreviousPermit()]);

    expect(supportPremisesPreviousPermits(written)).toEqual([{ holderName: '', validFrom: '', validTo: '' }]);
  });

  test('a row taken away leaves no parameter of its own behind', () => {
    const two = withSupportPremisesPreviousPermits(
      [],
      [
        { holderName: 'Tynderö Sjökrog AB', validFrom: '2019-05-01', validTo: '2023-09-30' },
        { holderName: 'Bryggan i Söråker HB', validFrom: '2024-05-15', validTo: '2025-09-30' },
      ]
    );

    const one = withSupportPremisesPreviousPermits(two, supportPremisesPreviousPermits(two).slice(0, 1));

    expect(one.some((parameter) => parameter.key.includes('PERMIT_2'))).toBe(false);
    expect(supportPremisesPreviousPermits(one)).toHaveLength(1);
  });

  test('every permit taken away leaves nothing of the list on the errand', () => {
    const written = withSupportPremisesPreviousPermits([], [emptySupportPremisesPreviousPermit()]);

    const cleared = withSupportPremisesPreviousPermits(written, []);

    expect(cleared.some((parameter) => parameter.key.startsWith('PREMISES_PREVIOUS_PERMIT'))).toBe(false);
    expect(supportPremisesPreviousPermits(cleared)).toEqual([]);
  });
});
