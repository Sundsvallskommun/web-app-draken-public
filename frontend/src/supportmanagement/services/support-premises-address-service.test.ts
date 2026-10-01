import type { CSupportStakeholder } from 'src/data-contracts/backend/data-contracts';
import { describe, expect, test } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import { getPremisesAddress } from './support-premises-address-service';

const NAMESPACE = 'AOT';
const PERMANENT_SERVING = 'aot_alcohol_serving_permit_application_permanent_serving';

const COMPANY = mockEnv.mockCompanyAddress;
const PREMISES = mockEnv.mockPremisesAddress;
const CONTACT = mockEnv.mockContactAddress;

const withoutSpaces = (postalCode: string) => postalCode.replace(/\s/g, '');

const OWNER: CSupportStakeholder = {
  role: 'PRIMARY',
  externalIdType: 'COMPANY',
  organizationName: mockEnv.mockCompanyName,
  address: COMPANY.street,
  zipCode: COMPANY.postalCode,
  city: COMPANY.city,
};

const REPORTER: CSupportStakeholder = {
  role: 'CONTACT',
  address: CONTACT.street,
  zipCode: CONTACT.postalCode,
  city: CONTACT.city,
};

const BESOKSADRESS = { gatuadress: PREMISES.street, postnummer: PREMISES.postalCode, postort: PREMISES.city };

const FORM_ADDRESS = {
  street: PREMISES.street,
  postalCode: withoutSpaces(PREMISES.postalCode),
  city: PREMISES.city,
  source: 'FORM',
};

/** An errand typed as `schemaName` — the category is its first segment, the type the rest. */
const errandFor = (
  schemaName: string,
  formData: Record<string, unknown> | undefined,
  stakeholders: CSupportStakeholder[] = [OWNER]
) => {
  const [category, ...type] = schemaName.replace(/^aot_/, '').split('_');
  return {
    labels: [
      { classification: 'CATEGORY', resourceName: category.toUpperCase() },
      { classification: 'TYPE', resourceName: type.join('_').toUpperCase() },
    ],
    jsonParameters: formData ? [{ key: schemaName, value: formData, schemaId: `${schemaName}-id` }] : [],
    stakeholders,
  };
};

const errand = (
  formData: Record<string, unknown> | undefined,
  stakeholders: CSupportStakeholder[] = [REPORTER, OWNER]
) => errandFor(PERMANENT_SERVING, formData, stakeholders);

describe('JA - the premises are at the owner', () => {
  test('uses the PRIMARY stakeholder address, not another stakeholder', () => {
    expect(getPremisesAddress(errand({ besoksadressSammaSomArendeagare: 'JA' }), NAMESPACE)).toEqual({
      street: COMPANY.street,
      postalCode: withoutSpaces(COMPANY.postalCode),
      city: COMPANY.city,
      source: 'OWNER',
    });
  });

  test('an owner without an address is no address', () => {
    const owner = { ...OWNER, address: '', zipCode: '', city: '' };

    expect(getPremisesAddress(errand({ besoksadressSammaSomArendeagare: 'JA' }, [owner]), NAMESPACE)).toBeUndefined();
  });

  test('an errand without an owner is no address', () => {
    expect(
      getPremisesAddress(errand({ besoksadressSammaSomArendeagare: 'JA' }, [REPORTER]), NAMESPACE)
    ).toBeUndefined();
  });

  test('a stale besoksadress left behind does not win over the owner', () => {
    const formData = { besoksadressSammaSomArendeagare: 'JA', besoksadress: BESOKSADRESS };

    expect(getPremisesAddress(errand(formData), NAMESPACE)?.street).toBe(COMPANY.street);
  });

  test('does not fall back to besoksadress when the owner has no address', () => {
    const formData = { besoksadressSammaSomArendeagare: 'JA', besoksadress: BESOKSADRESS };
    const owner = { ...OWNER, address: undefined };

    expect(getPremisesAddress(errand(formData, [owner]), NAMESPACE)).toBeUndefined();
  });
});

describe('NEJ or no question - the premises are in the form', () => {
  test('NEJ uses besoksadress', () => {
    const formData = { besoksadressSammaSomArendeagare: 'NEJ', besoksadress: BESOKSADRESS };

    expect(getPremisesAddress(errand(formData), NAMESPACE)).toEqual(FORM_ADDRESS);
  });

  test('NEJ on a draft without besoksadress is no address, not the owner', () => {
    expect(getPremisesAddress(errand({ besoksadressSammaSomArendeagare: 'NEJ' }), NAMESPACE)).toBeUndefined();
  });

  test('an absent question uses besoksadress', () => {
    expect(getPremisesAddress(errand({ besoksadress: BESOKSADRESS }), NAMESPACE)?.source).toBe('FORM');
  });

  test('no question and no besoksadress (catering) is no address', () => {
    const catering = errandFor('aot_alcohol_serving_permit_application_permanent_catering', { annat: 'svar' });

    expect(getPremisesAddress(catering, NAMESPACE)).toBeUndefined();
  });

  test('extra fields in besoksadress (tobacco) are ignored', () => {
    const formData = {
      besoksadressSammaSomArendeagare: 'NEJ',
      besoksadress: { ...BESOKSADRESS, telefonnummer: mockEnv.mockPhoneNumber, ePost: mockEnv.mockEmail },
    };

    expect(getPremisesAddress(errand(formData), NAMESPACE)).toEqual(FORM_ADDRESS);
  });

  test('a besoksadress without a street is no address', () => {
    const formData = { besoksadress: { ...BESOKSADRESS, gatuadress: '  ' } };

    expect(getPremisesAddress(errand(formData), NAMESPACE)).toBeUndefined();
  });

  test('a partial besoksadress keeps the street and leaves the rest unset', () => {
    const formData = { besoksadress: { gatuadress: ` ${PREMISES.street} ` } };

    expect(getPremisesAddress(errand(formData), NAMESPACE)).toEqual({
      street: PREMISES.street,
      postalCode: undefined,
      city: undefined,
      source: 'FORM',
    });
  });
});

describe('the errand document', () => {
  test('an errand without form data is no address', () => {
    expect(getPremisesAddress(errand(undefined), NAMESPACE)).toBeUndefined();
    expect(getPremisesAddress(undefined, NAMESPACE)).toBeUndefined();
  });

  test('reads only the document filed under the errand type, not other JSON parameters', () => {
    const other = errand(undefined);
    other.jsonParameters = [{ key: 'aot_other', value: { besoksadress: BESOKSADRESS }, schemaId: 'other-id' }];

    expect(getPremisesAddress(other, NAMESPACE)).toBeUndefined();
  });
});

describe.each([
  ['aot_alcohol_serving_permit_application_permanent_serving', true],
  ['aot_alcohol_serving_permit_application_tasting', true],
  ['aot_alcohol_folkol_serving_notification', true],
  ['aot_alcohol_folkol_sales_notification', true],
  ['aot_tobacco_sales_permit_application', true],
  ['aot_tobacco_ecigarette_sales_notification', true],
  ['aot_tobacco_tobacco_free_nicotine_sales_notification', true],
  ['aot_alcohol_serving_permit_application_temporary_serving_private', false],
  ['aot_alcohol_serving_permit_application_temporary_serving_public', false],
  ['aot_alcohol_serving_permit_application_farm_sales', false],
])('%s', (schemaName, asksQuestion) => {
  if (asksQuestion) {
    test('JA uses the owner', () => {
      const formData = { besoksadressSammaSomArendeagare: 'JA' };

      expect(getPremisesAddress(errandFor(schemaName, formData), NAMESPACE)?.source).toBe('OWNER');
    });

    test('NEJ uses besoksadress', () => {
      const formData = { besoksadressSammaSomArendeagare: 'NEJ', besoksadress: BESOKSADRESS };

      expect(getPremisesAddress(errandFor(schemaName, formData), NAMESPACE)?.source).toBe('FORM');
    });
  } else {
    test('besoksadress is always used', () => {
      expect(getPremisesAddress(errandFor(schemaName, { besoksadress: BESOKSADRESS }), NAMESPACE)?.source).toBe('FORM');
    });
  }
});
