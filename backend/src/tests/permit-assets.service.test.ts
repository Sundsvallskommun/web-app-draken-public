import { describe, expect, test } from 'vitest';

import { isPermitAssetType, permitAssetsFilter } from '@/services/permit-assets.service';

import { mockOrganizationNumber, mockOrganizationNumberDigits } from './helpers/mock-data';

describe('permitAssetsFilter', () => {
  const TYPES =
    "(type:'AlcoholServingPermit' or type:'TobaccoSalesPermit' or type:'LowAlcoholBeerSalesNotification' or type:'LowAlcoholBeerServingNotification' or type:'LowAlcoholBeerSalesAndServingNotification' or type:'ECigaretteSalesNotification' or type:'TobaccoFreeNicotineProductSalesNotification' or type:'CateringOccasionNotification')";
  const BASE = `${TYPES} and status:'ACTIVE'`;
  const holder = (text: string) => `jsonParameters.value ~ '*"permitHolder":{"name":"*${text}*","organizationNumber"*'`;
  const premises = (text: string) =>
    `jsonParameters.value ~ '*"premises":{"name":"*${text}*","address"*'` +
    ` or jsonParameters.value ~ '*"pointOfSale":{"name":"*${text}*","address"*'`;
  const number = (prefix: string) => `jsonParameters.value ~ '*"organizationNumber":"${prefix}*'`;

  test('leaves out only drafts when not only active permits are wanted', () => {
    expect(permitAssetsFilter({ activeOnly: false })).toBe(`${TYPES} and status!'DRAFT'`);
    expect(permitAssetsFilter({ term: 'Canton', activeOnly: false })).toBe(
      `${TYPES} and status!'DRAFT' and (${holder('Canton')} or ${premises('Canton')})`,
    );
  });

  test('narrows to the chosen types', () => {
    expect(permitAssetsFilter({ types: ['TobaccoSalesPermit', 'ECigaretteSalesNotification'] })).toBe(
      "(type:'TobaccoSalesPermit' or type:'ECigaretteSalesNotification') and status:'ACTIVE'",
    );
  });

  test('is the active permits of the listed types without a term', () => {
    expect(permitAssetsFilter({ term: '' })).toBe(BASE);
    expect(permitAssetsFilter({ term: '  ' })).toBe(BASE);
  });

  test('matches a word in the holder name or the place name (premises or point of sale), anchored between their keys', () => {
    expect(permitAssetsFilter({ term: 'Canton' })).toBe(`${BASE} and (${holder('Canton')} or ${premises('Canton')})`);
  });

  test.each([
    [mockOrganizationNumberDigits, mockOrganizationNumber],
    [mockOrganizationNumber.slice(0, 9), mockOrganizationNumber.slice(0, 9)],
    ['5560', '5560'],
  ])('also matches number %s as the start of the stored organisation number %s', (typed, stored) => {
    expect(permitAssetsFilter({ term: typed })).toBe(`${BASE} and (${holder(typed)} or ${premises(typed)} or ${number(stored)})`);
  });

  test('drops characters that would break out of or widen the pattern', () => {
    expect(permitAssetsFilter({ term: `O'Neil*s "%\\` })).toBe(`${BASE} and (${holder('ONeils ')} or ${premises('ONeils ')})`);
  });

  test('is the active permits of the listed types for a term of nothing but such characters', () => {
    expect(permitAssetsFilter({ term: "'*'" })).toBe(BASE);
  });
});

describe('isPermitAssetType', () => {
  test('accepts only the permit types', () => {
    expect(isPermitAssetType('AlcoholServingPermit')).toBe(true);
    expect(isPermitAssetType('PARKINGPERMIT')).toBe(false);
    expect(isPermitAssetType('ParatransitPermitLocal')).toBe(false);
  });
});
