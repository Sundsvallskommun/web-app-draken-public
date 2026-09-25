import { describe, expect, it } from 'vitest';

import { LegalEntity2 } from '@/data-contracts/legalentity/data-contracts';
import { toLegalEntityProfile } from '@/services/organization.service';

const legalEntity = (): LegalEntity2 => ({
  name: 'Testbolag AB',
  organizationNumber: '5560068255',
  form: 'Aktiebolag',
  acountingPeriodStart: 'JAN.01',
  acountingPeriodEnded: 'DEC.31',
  postAddress: { address1: 'Testgatan 1', postalCode: '85181', city: 'SUNDSVALL', coAdress: 'c/o Någon', country: 'SE' },
  employeeSize: { employeeSizeId: '2', name: '1–4 anställda' },
  businessDescription: 'Testverksamhet',
  officers: 'likvidator\nOFFICER-IDENTITY EN10003, FN10003, SUNDSVALL\n',
  fullSignatureDescription: 'Firman tecknas ensam av likvidatorn',
  shareCapital: 50400,
});

describe('toLegalEntityProfile', () => {
  it('keeps the fields the business description shows', () => {
    expect(toLegalEntityProfile(legalEntity())).toEqual({
      name: 'Testbolag AB',
      organizationNumber: '5560068255',
      form: 'Aktiebolag',
      acountingPeriodStart: 'JAN.01',
      acountingPeriodEnded: 'DEC.31',
      postAddress: { address1: 'Testgatan 1', postalCode: '85181', city: 'SUNDSVALL' },
      employeeSize: { name: '1–4 anställda' },
      businessDescription: 'Testverksamhet',
    });
  });

  it('leaves out the officers, which carry personal identity numbers', () => {
    expect(JSON.stringify(toLegalEntityProfile(legalEntity()))).not.toContain('OFFICER-IDENTITY');
  });

  it('keeps missing nested objects missing', () => {
    const profile = toLegalEntityProfile({ name: 'Utan adress AB' });

    expect(profile.postAddress).toBeUndefined();
    expect(profile.employeeSize).toBeUndefined();
  });
});
