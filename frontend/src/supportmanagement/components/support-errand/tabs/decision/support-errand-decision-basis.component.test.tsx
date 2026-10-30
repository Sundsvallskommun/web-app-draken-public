// @vitest-environment jsdom
import type { RJSFSchema } from '@rjsf/utils';
import { useConfigStore, useSupportStore } from '@stores/index';
import type { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import type { SupportErrand, SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../../tests/mock-env';
import { SupportErrandDecisionBasis } from './support-errand-decision-basis.component';

// The real module pulls in the stores and the app config; the section only needs the label lookup.
vi.mock('@supportmanagement/services/support-errand-service', () => ({
  getMostSpecificLabelType: (errand: SupportErrand) =>
    errand.labels?.find((label) => label.classification === 'SUBTYPE') ??
    errand.labels?.find((label) => label.classification === 'TYPE'),
}));

// The schema the answers were filed against; what it holds is decided per test.
const schemaState: { schema: RJSFSchema | null; loading: boolean } = { schema: null, loading: false };
vi.mock('@common/components/json/hooks/useJsonSchema', () => ({
  useJsonSchema: () => ({ ...schemaState, uiSchema: null, error: null }),
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

/** The permanent serving schema, cut down to what the rendered rows read. */
const SCHEMA: RJSFSchema = {
  type: 'object',
  properties: {
    businessDescriptionChoice: {
      type: 'string',
      oneOf: [{ const: 'UPLOAD', title: 'Bifoga' }],
    },
    businessDescription: { type: 'string' },
    beverages: {
      type: 'array',
      items: {
        type: 'string',
        oneOf: [
          { const: 'STRONG_BEER', title: 'Starköl' },
          { const: 'WINE', title: 'Vin' },
        ],
      },
    },
    financing: { type: 'array', items: { type: 'string', oneOf: [{ const: 'OWN_FUNDS', title: 'Egna medel' }] } },
    ownFunds: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bank: { type: 'string', title: 'Bank' },
          amountSek: { type: 'string', title: 'Belopp (kronor)' },
        },
      },
    },
    financingNotes: { type: 'string' },
    premisesName: { type: 'string' },
    premisesAddressSameAsCompany: { type: 'string' },
    premisesAddress: { type: 'object', properties: {} },
    premisesContact: { type: 'object', properties: {} },
    seating: { type: 'object', properties: { seatsIndoor: { type: 'string' } } },
  },
};

const ANSWERS = {
  businessDescriptionChoice: 'UPLOAD',
  beverages: ['STRONG_BEER', 'WINE'],
  financing: ['OWN_FUNDS'],
  ownFunds: [{ bank: 'Testbanken', amountSek: '600000' }],
  financingNotes: '<p>Egna medel kommer från <b>ägarna</b></p><script>alert(1)</script>',
  premisesName: mockEnv.mockPremisesName,
  premisesAddress: { street: PREMISES.street, postalCode: PREMISES.postalCode, city: PREMISES.city },
  premisesContact: { phoneNumber: mockEnv.mockPhoneNumber },
  seating: { seatsIndoor: '72' },
};

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
const sectionIds = () =>
  [...document.querySelectorAll('section[data-cy^="decision-basis-"]')].map((section) =>
    section.getAttribute('data-cy')!.replace('decision-basis-', '')
  );

beforeEach(() => {
  schemaState.schema = SCHEMA;
  schemaState.loading = false;
  useConfigStore.setState({ municipalityId: '2281' });
  useSupportStore.setState({ supportAttachments: undefined });
});

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
  renderBasis(errand(company, ANSWERS));

  expect(value('premises-address')).toBe(`${PREMISES.street}, ${PREMISES.postalCode} ${PREMISES.city}`);
  expect(label('premises-address')).toBe('common:decision.basis.premises.address_from.FORM');
});

test('premises at the owner address are marked as such', () => {
  renderBasis(errand(company, { premisesAddressSameAsCompany: 'YES' }));

  expect(value('premises-address')).toBe(`${COMPANY.street}, ${COMPANY.postalCode} ${COMPANY.city}`);
  expect(label('premises-address')).toBe('common:decision.basis.premises.address_from.OWNER');
});

test('an errand without answers shows a dash for the address and says the form is missing', () => {
  renderBasis(errand(company));

  expect(value('premises-address')).toBe('common:decision.empty_value');
  expect(label('premises-address')).toBe('common:decision.basis.premises.address');
  expect(screen.getByText('common:decision.basis.no_form')).toBeTruthy();
  expect(sectionIds()).toEqual(['errand', 'holder', 'premises', 'referrals']);
});

test('the sections read from the form show the answers with the titles of their schema', () => {
  renderBasis(errand(company, ANSWERS));

  expect(sectionIds()).toEqual([
    'errand',
    'holder',
    'operation',
    'serving_premises',
    'serving',
    'financing',
    'premises',
    'referrals',
  ]);
  expect(value('serving-drinks')).toBe('Starköl, Vin');
  expect(label('serving-drinks')).toBe('common:decision.basis.serving.drinks');
  expect(value('financing-sources')).toBe('Egna medel');
  expect(value('serving_premises-seats')).toBe('72');
  expect(value('premises-name')).toBe(mockEnv.mockPremisesName);
  expect(value('premises-contact')).toBe(mockEnv.mockPhoneNumber);
  // The name leads the premises section, the address follows it.
  expect(
    [...document.querySelectorAll('[data-cy="decision-basis-premises"] dd')].map((dd) => dd.getAttribute('data-cy'))
  ).toEqual(['decision-basis-premises-name', 'decision-basis-premises-address', 'decision-basis-premises-contact']);
});

test('the serving premises name every drawing uploaded, and hold what handles them', () => {
  schemaState.schema = { ...SCHEMA, 'x-attachments': [{ key: 'FLOOR_PLAN', label: 'Planritning' }] };
  useSupportStore.setState({
    supportAttachments: [
      { id: '1', fileName: 'plan-1.pdf', mimeType: 'application/pdf', purpose: { name: 'FLOOR_PLAN' } },
      { id: '2', fileName: 'meny.pdf', mimeType: 'application/pdf', purpose: { name: 'MENU' } },
      { id: '3', fileName: 'plan-2.pdf', mimeType: 'application/pdf', purpose: { name: 'FLOOR_PLAN' } },
      // Given its purpose by hand: the schema does not ask for one.
      { id: '4', fileName: 'kok.pdf', mimeType: 'application/pdf', purpose: { name: 'KITCHEN_FLOOR_PLAN' } },
    ] as SupportAttachment[],
  });
  render(
    <SupportErrandDecisionBasis
      supportErrand={errand(company, ANSWERS)}
      supportMetadata={METADATA}
      servingPremisesHandling={<span data-cy="serving-premises-handling" />}
    />
  );

  expect(value('serving_premises-drawing')).toBe('common:decision.basis.attachment');
  expect(value('serving_premises-kitchen-drawing')).toBe('common:decision.basis.attachment');
  expect(
    document.querySelector('[data-cy="decision-basis-serving_premises"] [data-cy="serving-premises-handling"]')
  ).toBeTruthy();
});

test('a table is rendered with the headers of the schema, and written text as sanitized HTML', () => {
  renderBasis(errand(company, ANSWERS));

  const table = document.querySelector('[data-cy="decision-basis-financing-own-funds"] table')!;
  expect([...table.querySelectorAll('th')].map((th) => th.textContent)).toEqual(['Bank', 'Belopp (kronor)']);
  expect([...table.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['Testbanken', '600000']);

  const notes = document.querySelector('[data-cy="decision-basis-financing-notes"]')!;
  expect(notes.querySelector('b')?.textContent).toBe('ägarna');
  expect(notes.innerHTML).not.toContain('<script>');
});

test('an answer given as an upload names the attachment with that purpose, or says it is missing', () => {
  useSupportStore.setState({
    supportAttachments: [
      { id: '1', fileName: 'verksamhet.pdf', mimeType: 'application/pdf', purpose: { name: 'BUSINESS_DESCRIPTION' } },
    ] as SupportAttachment[],
  });
  renderBasis(errand(company, ANSWERS));
  expect(value('operation-description')).toBe('common:decision.basis.attachment');

  cleanup();
  useSupportStore.setState({ supportAttachments: [] });
  renderBasis(errand(company, ANSWERS));
  expect(value('operation-description')).toBe('common:decision.basis.attachment_missing');
});

test('while the schema loads, the form sections wait rather than show raw constants', () => {
  schemaState.loading = true;
  renderBasis(errand(company, ANSWERS));

  expect(document.querySelector('[data-cy="decision-basis-loading"]')).toBeTruthy();
  expect(sectionIds()).toEqual(['errand', 'holder', 'premises', 'referrals']);
  expect(value('premises-name')).toBeUndefined();
});

// hasServingPremises is a constant until it is decided what tells a serving permit from the rest.
test.todo('an errand that is not about a serving permit has no sections about serving');

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

test('what handles the serving hours and the serving is shown in its section, even without rows from the form', () => {
  render(
    <SupportErrandDecisionBasis
      supportErrand={errand(company)}
      supportMetadata={METADATA}
      servingHoursHandling={<span data-cy="serving-hours-handling" />}
      servingHandling={<span data-cy="serving-handling" />}
    />
  );

  expect(sectionIds()).toEqual(['errand', 'holder', 'serving_hours', 'serving', 'premises', 'referrals']);
  expect(
    document.querySelector('[data-cy="decision-basis-serving_hours"] [data-cy="serving-hours-handling"]')
  ).toBeTruthy();
  expect(document.querySelector('[data-cy="decision-basis-serving"] [data-cy="serving-handling"]')).toBeTruthy();
  expect(document.querySelector('[data-cy="decision-basis-serving"] dl')).toBeNull();
});

test('handling follows the rows of its section when the form has them', () => {
  render(
    <SupportErrandDecisionBasis
      supportErrand={errand(company, ANSWERS)}
      supportMetadata={METADATA}
      servingHandling={<span data-cy="serving-handling" />}
    />
  );

  const section = document.querySelector('[data-cy="decision-basis-serving"]')!;
  expect(value('serving-drinks')).toBe('Starköl, Vin');
  expect(section.querySelector('dl + [data-cy="serving-handling"]')).toBeTruthy();
});
