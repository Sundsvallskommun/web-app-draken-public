import { describe, expect, test } from 'vitest';

import {
  supportFiledDocuments,
  supportTobaccoSalesPeriod,
  supportTobaccoSalesPoint,
  TOBACCO_RECORD_PURPOSES,
  TOBACCO_SELF_MONITORING_PURPOSES,
} from './support-tobacco-application-service';

const NAMESPACE = 'AOT';
const SCHEMA = 'aot_tobacco_sales_permit_application';

const errandOf = (formData: Record<string, unknown> | undefined) => ({
  labels: [
    { classification: 'CATEGORY', resourceName: 'TOBACCO' },
    { classification: 'TYPE', resourceName: 'SALES_PERMIT_APPLICATION' },
  ],
  jsonParameters: formData ? [{ key: SCHEMA, value: formData, schemaId: `${SCHEMA}-id` }] : [],
});

const salesPointOf = (formData: Record<string, unknown> | undefined) =>
  supportTobaccoSalesPoint(errandOf(formData) as never, NAMESPACE);

const salesPeriodOf = (formData: Record<string, unknown> | undefined) =>
  supportTobaccoSalesPeriod(errandOf(formData) as never, NAMESPACE);

describe('the point of sale', () => {
  test('is named by the tobacco schemas own key, not the serving one', () => {
    expect(salesPointOf({ pointOfSaleName: 'Kiosken i Bergsåker' }).name).toBe('Kiosken i Bergsåker');
    expect(salesPointOf({ premisesName: 'Krogen' }).name).toBe('Krogen');
  });

  test('tells a yes from a no, and both from a question the applicant never reached', () => {
    const asked = salesPointOf({
      includesDistanceSelling: 'YES',
      distanceSellingWebsite: 'https://kiosken.se',
      includesParticularlyDangerousProducts: 'NO',
    });

    expect(asked.distanceSelling).toBe(true);
    expect(asked.website).toBe('https://kiosken.se');
    expect(asked.dangerousProducts).toBe(false);
    expect(asked.supplierAgreement).toBeUndefined();
  });

  test('is empty when the errand carries no application at all', () => {
    expect(salesPointOf(undefined)).toEqual({});
  });
});

describe('the period the application asks to sell for', () => {
  test('is read as indefinite or as the dates the applicant gave', () => {
    expect(salesPeriodOf({ salesPeriod: 'INDEFINITE', salesStartDate: '2026-11-01' })).toEqual({
      indefinite: true,
      startDate: '2026-11-01',
      period: undefined,
    });

    expect(
      salesPeriodOf({
        salesPeriod: 'TEMPORARY',
        salesPeriodDates: { fromDate: '2026-11-01', toDate: '2027-02-28' },
      })
    ).toMatchObject({ indefinite: false, period: '2026-11-01 - 2027-02-28' });
  });

  test('says nothing about a period the application does not state', () => {
    expect(salesPeriodOf({})).toEqual({ indefinite: undefined, startDate: undefined, period: undefined });
  });
});

describe('the documents the applicant filed', () => {
  const attachments = [
    { id: 'a1', fileName: 'skatteverket.pdf', purpose: { name: 'TAX_AGENCY_EXTRACT', displayName: 'Registerutdrag' } },
    { id: 'a2', fileName: 'egenkontroll.pdf', purpose: { name: 'SELF_MONITORING_PROGRAM' } },
    { id: 'a3', fileName: 'meny.pdf', purpose: { name: 'MENU' } },
    { id: 'a4', fileName: 'utan-syfte.pdf' },
  ];

  test('are the ones whose purpose the examination asks for', () => {
    expect(supportFiledDocuments(attachments as never, TOBACCO_RECORD_PURPOSES)).toEqual([
      { id: 'a1', fileName: 'skatteverket.pdf', purpose: 'Registerutdrag' },
    ]);
    expect(supportFiledDocuments(attachments as never, TOBACCO_SELF_MONITORING_PURPOSES)).toEqual([
      { id: 'a2', fileName: 'egenkontroll.pdf', purpose: 'SELF_MONITORING_PROGRAM' },
    ]);
  });

  test('are none at all when nothing is filed', () => {
    expect(supportFiledDocuments(undefined, TOBACCO_RECORD_PURPOSES)).toEqual([]);
  });
});
