// @vitest-environment jsdom
import type { SupportErrand, SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportErrandDecisionBasis } from './support-errand-decision-basis.component';

// The real module pulls in the stores and the app config; the section only needs the label lookup.
vi.mock('@supportmanagement/services/support-errand-service', () => ({
  getMostSpecificLabelType: (errand: SupportErrand) =>
    errand.labels?.find((label) => label.classification === 'SUBTYPE') ??
    errand.labels?.find((label) => label.classification === 'TYPE'),
}));

const METADATA = { namespace: 'AOT' } as SupportMetadata;
const SCHEMA_NAME = 'aot_alcohol_serving_permit_application_permanent_serving';
const SUBTYPE_NAME = 'Stadigvarande servering';

const COMPANY = mockEnv.mockCompanyAddress;
const PREMISES = mockEnv.mockPremisesAddress;

const LABELS = [
  { classification: 'CATEGORY', resourceName: 'ALCOHOL', displayName: 'Alkohol' },
  { classification: 'TYPE', resourceName: 'SERVING_PERMIT_APPLICATION', displayName: 'Serveringstillstånd' },
  { classification: 'SUBTYPE', resourceName: 'PERMANENT_SERVING', displayName: SUBTYPE_NAME },
];

const company = {
  role: 'PRIMARY',
  stakeholderType: 'ORGANIZATION',
  organizationName: mockEnv.mockCompanyName,
  organizationNumber: mockEnv.mockOrganizationNumber,
  address: COMPANY.street,
  zipCode: COMPANY.postalCode,
  city: COMPANY.city,
  phoneNumbers: [{ value: mockEnv.mockPhoneNumber }],
  emails: [{ value: mockEnv.mockEmail }],
} as SupportStakeholderFormModel;

const person = {
  role: 'PRIMARY',
  stakeholderType: 'PERSON',
  // The errand mapper fills organizationName from firstName, so a person carries one too.
  organizationName: mockEnv.mockFirstName,
  firstName: mockEnv.mockFirstName,
  lastName: mockEnv.mockLastName,
  phoneNumbers: [],
  emails: [],
} as unknown as SupportStakeholderFormModel;

/** An errand as the store holds it: the owner both as `customer` and among the raw `stakeholders`. */
const errand = (owner: SupportStakeholderFormModel | undefined, formData?: Record<string, unknown>): SupportErrand =>
  ({
    errandNumber: mockEnv.mockErrandNumber,
    labels: LABELS,
    customer: owner ? [owner] : [],
    stakeholders: owner ? [owner] : [],
    jsonParameters: formData ? [{ key: SCHEMA_NAME, value: formData, schemaId: `${SCHEMA_NAME}-id` }] : [],
  } as unknown as SupportErrand);

const renderBasis = (supportErrand: SupportErrand) =>
  render(<SupportErrandDecisionBasis supportErrand={supportErrand} supportMetadata={METADATA} />);

const value = (row: string) => document.querySelector(`[data-cy="decision-basis-${row}"]`)?.textContent;
const label = (row: string) =>
  document.querySelector(`[data-cy="decision-basis-${row}"]`)?.previousElementSibling?.textContent;

afterEach(cleanup);

test('shows what the errand concerns: its most specific type and its number', () => {
  renderBasis(errand(company));

  expect(value('errand-type')).toBe(SUBTYPE_NAME);
  expect(value('errand-number')).toBe(mockEnv.mockErrandNumber);
});

test('shows the owner organization as the licence holder', () => {
  renderBasis(errand(company));

  expect(value('holder-organization')).toBe(mockEnv.mockCompanyName);
  expect(value('holder-organization-number')).toBe(mockEnv.mockOrganizationNumber);
  expect(value('holder-address')).toBe(`${COMPANY.street}, ${COMPANY.postalCode} ${COMPANY.city}`);
  expect(value('holder-phone')).toBe(mockEnv.mockPhoneNumber);
  expect(value('holder-email')).toBe(mockEnv.mockEmail);
  expect(value('holder-name')).toBeUndefined();
});

test('an owner who is a person is shown by name, and what the errand lacks as a dash', () => {
  renderBasis(errand(person));

  expect(value('holder-name')).toBe(`${mockEnv.mockFirstName} ${mockEnv.mockLastName}`);
  expect(value('holder-organization')).toBeUndefined();
  expect(value('holder-address')).toBe('common:decision.empty_value');
  expect(value('holder-phone')).toBe('common:decision.empty_value');
});

test('an errand without an owner says so instead of listing empty rows', () => {
  renderBasis(errand(undefined));

  expect(screen.getByText('common:decision.basis.holder.missing')).toBeTruthy();
  expect(value('holder-address')).toBeUndefined();
});

test('shows the premises address filled in on the form', () => {
  renderBasis(
    errand(company, {
      besoksadress: { gatuadress: PREMISES.street, postnummer: PREMISES.postalCode, postort: PREMISES.city },
    })
  );

  expect(value('premises-address')).toBe(`${PREMISES.street}, ${PREMISES.postalCode} ${PREMISES.city}`);
  expect(label('premises-address')).toBe('common:decision.basis.premises.address_from.FORM');
});

test('premises at the owner address are marked as such', () => {
  renderBasis(errand(company, { besoksadressSammaSomArendeagare: 'JA' }));

  expect(value('premises-address')).toBe(`${COMPANY.street}, ${COMPANY.postalCode} ${COMPANY.city}`);
  expect(label('premises-address')).toBe('common:decision.basis.premises.address_from.OWNER');
});

test('an errand without a premises address shows a dash', () => {
  renderBasis(errand(company));

  expect(value('premises-address')).toBe('common:decision.empty_value');
  expect(label('premises-address')).toBe('common:decision.basis.premises.address');
});

test('the sections read from the form are placeholders until its keys are settled', () => {
  renderBasis(errand(company));

  ['operation', 'serving_hours', 'serving', 'financing'].forEach((section) => {
    const placeholder = document.querySelector(`[data-cy="decision-basis-${section}"]`);
    expect(placeholder?.textContent).toContain(`common:decision.basis.${section}`);
    expect(placeholder?.textContent).toContain('common:decision.basis.from_form');
  });
  expect(document.querySelector('[data-cy="decision-basis-referrals"]')?.textContent).toContain(
    'common:decision.basis.not_built'
  );
});

test('what handles the premises is shown in the premises section', () => {
  render(
    <SupportErrandDecisionBasis
      supportErrand={errand(company)}
      supportMetadata={METADATA}
      premisesHandling={<span data-cy="premises-handling" />}
    />
  );

  expect(document.querySelector('[data-cy="decision-basis-premises"] [data-cy="premises-handling"]')).toBeTruthy();
});
