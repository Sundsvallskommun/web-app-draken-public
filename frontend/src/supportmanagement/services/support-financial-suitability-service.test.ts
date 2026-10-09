import { expect, test } from 'vitest';

import {
  supportFinancingAmount,
  supportFinancingNotes,
  supportFinancingSourceLine,
  supportFinancingSources,
} from './support-financial-suitability-service';

const GROUP = ' ';

const errandWith = (application: Record<string, unknown>) => ({ jsonParameters: [{ value: application }] } as never);

test('the financing is read in the order the form asks for it, with lender and amount', () => {
  const sources = supportFinancingSources(
    errandWith({
      banklan: [{ langivare: 'Almi', beloppKronor: '1500000' }],
      egnaMedel: [{ bank: 'Handelsbanken', kontonummer: '12345678', beloppKronor: '500000' }],
    })
  );

  expect(sources.map(supportFinancingSourceLine)).toEqual([
    `Egna medel 500${GROUP}000 kr (Handelsbanken)`,
    `Banklån 1${GROUP}500${GROUP}000 kr (Almi)`,
  ]);
});

test('the account number an applicant gives for their own means is left out', () => {
  const sources = supportFinancingSources(
    errandWith({ egnaMedel: [{ bank: 'Handelsbanken', kontonummer: '12345678', beloppKronor: '500000' }] })
  );

  expect(JSON.stringify(sources)).not.toContain('12345678');
});

test('other financing is named by the loan type the applicant wrote, not by its heading', () => {
  expect(
    supportFinancingSources(
      errandWith({ annanFinansiering: [{ lanetyp: 'Bryggerilån', langivare: 'Spendrups', beloppKronor: '250000' }] })
    ).map(supportFinancingSourceLine)
  ).toEqual([`Bryggerilån 250${GROUP}000 kr (Spendrups)`]);
});

test('an application that asks nothing about financing leaves the section with nothing to show', () => {
  expect(supportFinancingSources(errandWith({ serveringsstalletsNamn: 'Krogen' }))).toEqual([]);
  expect(supportFinancingSources(undefined)).toEqual([]);
  expect(supportFinancingNotes(undefined)).toBe('');
});

test('an amount is grouped the way it is read, and anything that is not a number is left alone', () => {
  expect(supportFinancingAmount('1500000')).toBe(`1${GROUP}500${GROUP}000 kr`);
  expect(supportFinancingAmount('1 500 000')).toBe(`1${GROUP}500${GROUP}000 kr`);
  expect(supportFinancingAmount('cirka 1,5 mkr')).toBe('cirka 1,5 mkr');
  expect(supportFinancingAmount(undefined)).toBe('');
});

test('a source without a lender is still worth showing', () => {
  expect(supportFinancingSourceLine({ kind: 'Privatlån', amount: '50 000 kr', lender: '' })).toBe(
    'Privatlån 50 000 kr'
  );
});

test('the notes the applicant added about the financing are carried as written', () => {
  expect(supportFinancingNotes(errandWith({ ovrigaUpplysningarFinansiering: '  Lånet betalas av 2027.  ' }))).toBe(
    'Lånet betalas av 2027.'
  );
});
