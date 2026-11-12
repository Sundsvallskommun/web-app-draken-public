import { describe, expect, test } from 'vitest';

import { permitAssetsFilter, permitAssetTypes } from '@/services/permit-assets.service';

import { mockOrganizationNumber, mockOrganizationNumberDigits } from './helpers/mock-data';

describe('permitAssetsFilter', () => {
  const AOT_TYPES = permitAssetTypes('AOT').map(({ type }) => type);
  const filter = (query: Parameters<typeof permitAssetsFilter>[0]) => permitAssetsFilter(query, AOT_TYPES);
  const TYPES =
    "(type:'AlcoholServingPermit' or type:'TobaccoSalesPermit' or type:'LowAlcoholBeerSalesNotification' or type:'LowAlcoholBeerServingNotification' or type:'LowAlcoholBeerSalesAndServingNotification' or type:'ECigaretteSalesNotification' or type:'TobaccoFreeNicotineProductSalesNotification' or type:'CateringOccasionNotification')";
  const BASE = `${TYPES} and status:'ACTIVE'`;
  const holder = (text: string) => `jsonParameters.value ~ '*"permitHolder":{"name":"*${text}*","organizationNumber"*'`;
  const premises = (text: string) =>
    `jsonParameters.value ~ '*"premises":{"name":"*${text}*","address"*'` +
    ` or jsonParameters.value ~ '*"pointOfSale":{"name":"*${text}*","address"*'`;
  const number = (prefix: string) => `jsonParameters.value ~ '*"organizationNumber":"${prefix}*'`;

  test('leaves out only drafts when not only active permits are wanted', () => {
    expect(filter({ activeOnly: false })).toBe(`${TYPES} and status!'DRAFT'`);
    expect(filter({ term: 'Canton', activeOnly: false })).toBe(`${TYPES} and status!'DRAFT' and (${holder('Canton')} or ${premises('Canton')})`);
  });

  test('narrows to the chosen types', () => {
    expect(filter({ types: ['TobaccoSalesPermit', 'ECigaretteSalesNotification'] })).toBe(
      "(type:'TobaccoSalesPermit' or type:'ECigaretteSalesNotification') and status:'ACTIVE'",
    );
  });

  test('is the active permits of the listed types without a term', () => {
    expect(filter({ term: '' })).toBe(BASE);
    expect(filter({ term: '  ' })).toBe(BASE);
  });

  test('matches a word in the holder name or the place name (premises or point of sale), anchored between their keys', () => {
    expect(filter({ term: 'Canton' })).toBe(`${BASE} and (${holder('Canton')} or ${premises('Canton')})`);
  });

  test.each([
    [mockOrganizationNumberDigits, mockOrganizationNumber],
    [mockOrganizationNumber.slice(0, 9), mockOrganizationNumber.slice(0, 9)],
    ['5560', '5560'],
  ])('also matches number %s as the start of the stored organisation number %s', (typed, stored) => {
    expect(filter({ term: typed })).toBe(`${BASE} and (${holder(typed)} or ${premises(typed)} or ${number(stored)})`);
  });

  test('drops characters that would break out of or widen the pattern', () => {
    expect(filter({ term: `O'Neil*s "%\\` })).toBe(`${BASE} and (${holder('ONeils ')} or ${premises('ONeils ')})`);
  });

  test('is the active permits of the listed types for a term of nothing but such characters', () => {
    expect(filter({ term: "'*'" })).toBe(BASE);
  });
});

describe('permitAssetTypes', () => {
  test('gives AoT its alcohol and tobacco permits, with display names', () => {
    expect(permitAssetTypes('AOT')).toContainEqual({ type: 'AlcoholServingPermit', displayName: 'Serveringstillstånd' });
    expect(permitAssetTypes('AOT').map(({ type }) => type)).not.toContain('PARKINGPERMIT');
  });

  test('gives an app without a list no types', () => {
    expect(permitAssetTypes('KC')).toEqual([]);
    expect(permitAssetTypes(undefined)).toEqual([]);
  });
});
