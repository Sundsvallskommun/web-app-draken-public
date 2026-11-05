// @vitest-environment jsdom
import { searchPerson } from '@common/services/adress-service';
import { getLegalEntityEngagements, getLegalEntityPersonEngagements } from '@common/services/legal-entity-service';
import { useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { hyphenatedIdentity } from '@supportmanagement/services/support-pbi-service';
import { supportStatementTemplateParameters } from '@supportmanagement/services/support-statement-template-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { type FC, useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportStatementCard } from './support-statement-card.component';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { person?: string; company?: string }) =>
      options?.person || options?.company ? `${key}=${options.person ?? options.company}` : key,
  }),
}));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
const preview: { parameters?: Record<string, unknown> } = {};
vi.mock('@common/components/template-preview/template-pdf-preview.component', () => ({
  TemplatePdfPreview: (props: { parameters?: Record<string, unknown> }) => {
    preview.parameters = props.parameters;
    return null;
  },
}));
vi.mock('@common/services/adress-service', () => ({ searchPerson: vi.fn() }));
vi.mock('@common/services/legal-entity-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLegalEntityEngagements: vi.fn(),
  getLegalEntityPersonEngagements: vi.fn(),
}));
vi.mock('react-hook-form', () => ({
  useFormContext: () => ({ watch: (name: 'customer' | 'contacts') => form[name] }),
}));

const DRIVEN = mockEnv.mockOrganizationNumber.replace('-', '');
const ERICAS_PARTY_ID = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';
const ERICAS_IDENTITY = mockEnv.mockSecondaryPersonNumber;
const AXELS_IDENTITY = mockEnv.mockTertiaryPersonNumber;
const AXELS_PARTY_ID = 'd1eda732-5aec-45e2-a673-4debd42b2f04';

// Erica is marked on the errand, Axel is only named by the company data.
const form = {
  customer: [],
  contacts: [
    {
      internalId: 'erica',
      externalId: ERICAS_PARTY_ID,
      firstName: 'Erica',
      lastName: 'Fritz',
      personNumber: ERICAS_IDENTITY,
      parameters: [
        { key: 'PBI', values: ['true'] },
        { key: 'PBI_ROLE', values: ['Styrelsesuppleant'] },
      ],
    },
  ],
} as never as { customer: never[]; contacts: never[] };

const COMPANY_ENGAGEMENTS = [
  {
    name: 'Erica Fritz',
    identity: { code: ERICAS_IDENTITY, type: 'PERSONNUMMER' },
    relations: [{ description: 'Styrelsesuppleant' }],
  },
  {
    name: 'Axel Hellman',
    identity: { code: AXELS_IDENTITY, type: 'PERSONNUMMER' },
    relations: [{ description: 'Styrelseledamot' }],
  },
];

const PERSON_ENGAGEMENTS = [
  { organizationNumber: DRIVEN, name: 'Drivet AB', roles: [{ description: 'Verkställande direktör' }] },
];

const statementForm = {
  title: 'Remiss',
  status: 'DRAFT',
  dueAt: '2026-12-01',
  counterpartyName: 'Skatteverket',
  question: '',
  label: '',
  freeText: '',
  responseText: '',
  outcome: '',
};

const formChanged = vi.fn();

/** The section owns the form, so the card is mounted in something that writes its changes back. */
const Harness: FC<{ written: Record<string, string>; writable: boolean; counterpartyName: string }> = ({
  written,
  writable,
  counterpartyName,
}) => {
  const [form, setForm] = useState({ ...statementForm, counterpartyName, ...written });

  return (
    <SupportStatementCard
      statement={{ id: 'st-1', type: 'REFERRAL', status: 'DRAFT', attachments: [] }}
      form={form as never}
      problem={undefined}
      errandId="errand-1"
      errandNumber="AOT-26100216"
      municipalityId="2281"
      writable={writable}
      onFormChange={(changes) => {
        formChanged(changes);
        setForm((current) => ({ ...current, ...changes }));
      }}
      onChanged={vi.fn()}
      onRemoved={vi.fn()}
    />
  );
};

const mountCard = (writable = true, counterpartyName = 'Skatteverket', written: Record<string, string> = {}) =>
  render(<Harness written={written} writable={writable} counterpartyName={counterpartyName} />);

const withAnUnderlay = (statement: object) =>
  render(
    <SupportStatementCard
      statement={statement as never}
      form={{ ...statementForm, counterpartyName: 'Annan instans', label: 'Yttrande' } as never}
      problem={undefined}
      errandId="errand-1"
      errandNumber="AOT-26100216"
      municipalityId="2281"
      writable
      onFormChange={formChanged}
      onChanged={vi.fn()}
      onRemoved={vi.fn()}
    />
  );

const findOf = (name: string) => document.querySelector(`[data-cy="${name}"]`);

/** The people are only asked for once a template that lists them is chosen. */
const chooseTemplate = (identifier: string) =>
  fireEvent.change(findOf('statement-template') as HTMLSelectElement, { target: { value: identifier } });

const chooseTheTaxAgencyTemplate = () => chooseTemplate('tax-agency-request-serving');
const checkboxOf = (name: string) =>
  [...document.querySelectorAll('[data-cy="statement-people"] input[type="checkbox"]')].find((box) =>
    box.closest('label')?.textContent?.includes(name)
  ) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({
    supportErrand: {
      id: 'errand-1',
      errandNumber: 'AOT-26100216',
      stakeholders: [{ role: 'PRIMARY', externalId: 'company-1', externalIdType: 'COMPANY' }],
      customer: form.customer,
      contacts: form.contacts,
    } as never,
    supportAttachments: [],
  });
  useMetadataStore.setState({ supportMetadata: { namespace: 'ALKT', statementOutcomes: [] } } as never);
  useUserStore.setState({ user: { firstName: 'Annika', lastName: 'Jansson', email: 'annika@sundsvall.se' } } as never);
  vi.mocked(getLegalEntityEngagements).mockResolvedValue(COMPANY_ENGAGEMENTS);
  vi.mocked(getLegalEntityPersonEngagements).mockResolvedValue(PERSON_ENGAGEMENTS);
  vi.mocked(searchPerson).mockResolvedValue({ personId: AXELS_PARTY_ID } as never);
});

afterEach(cleanup);

test('a person the errand knows is offered their companies, and loses the offer when they are left out', async () => {
  mountCard();
  chooseTheTaxAgencyTemplate();

  // A marked person is listed in the request from the start, so their companies are offered at once.
  await waitFor(() => expect(findOf(`statement-companies-${ERICAS_PARTY_ID}-select`)).toBeTruthy());
  expect(getLegalEntityPersonEngagements).toHaveBeenCalledWith(ERICAS_PARTY_ID);

  fireEvent.click(checkboxOf('Erica Fritz'));

  await waitFor(() => expect(findOf(`statement-companies-${ERICAS_PARTY_ID}-select`)).toBeNull());
});

test('a template that names the people alone is not asked about their companies', async () => {
  mountCard(true, 'Polismyndigheten');
  chooseTemplate('referral-police');

  await waitFor(() => expect(checkboxOf('Erica Fritz')).toBeTruthy());

  expect(checkboxOf('Erica Fritz').checked).toBe(true);
  expect(findOf(`statement-companies-${ERICAS_PARTY_ID}-select`)).toBeNull();
  expect(getLegalEntityPersonEngagements).not.toHaveBeenCalled();
});

test('a person the errand does not know is looked up by their personal number instead', async () => {
  mountCard();
  chooseTheTaxAgencyTemplate();

  await waitFor(() => expect(checkboxOf('Axel Hellman')).toBeTruthy());
  fireEvent.click(checkboxOf('Axel Hellman'));

  await waitFor(() => expect(searchPerson).toHaveBeenCalledWith(hyphenatedIdentity(AXELS_IDENTITY)));
  await waitFor(() => expect(getLegalEntityPersonEngagements).toHaveBeenCalledWith(AXELS_PARTY_ID));
  expect(findOf(`statement-companies-${AXELS_IDENTITY}-select`)).toBeTruthy();
});

test('a person nobody can look up is told so, rather than shown nothing', async () => {
  vi.mocked(searchPerson).mockResolvedValue(undefined);
  mountCard();
  chooseTheTaxAgencyTemplate();

  await waitFor(() => expect(checkboxOf('Axel Hellman')).toBeTruthy());
  fireEvent.click(checkboxOf('Axel Hellman'));

  await waitFor(() => expect(findOf(`statement-companies-${AXELS_IDENTITY}-unknown`)).toBeTruthy());
  expect(getLegalEntityPersonEngagements).not.toHaveBeenCalledWith(AXELS_PARTY_ID);
});

test('a company ticked for a person reaches the template under that person', async () => {
  mountCard();
  chooseTheTaxAgencyTemplate();

  // Two hops before the option is there: the company data, then that person's engagements.
  await waitFor(() => expect(findOf(`statement-companies-${ERICAS_PARTY_ID}-option-${DRIVEN}`)).toBeTruthy(), {
    timeout: 5000,
  });

  fireEvent.click(findOf(`statement-companies-${ERICAS_PARTY_ID}-option-${DRIVEN}`) as HTMLElement);

  await waitFor(() => expect(findOf(`statement-companies-${ERICAS_PARTY_ID}-chip-${DRIVEN}`)).toBeTruthy());

  const parameters = supportStatementTemplateParameters({
    identifier: 'tax-agency-request-serving',
    errand: undefined,
    handlerName: 'Annika Jansson',
    handlerEmail: 'annika@sundsvall.se',
    counterpartyName: 'Skatteverket',
    dueAt: '2026-12-01',
    people: [
      {
        partyId: ERICAS_PARTY_ID,
        name: 'Erica Fritz',
        firstName: 'Erica',
        lastName: 'Fritz',
        personalNumber: hyphenatedIdentity(ERICAS_IDENTITY),
        roles: 'Styrelsesuppleant',
        marked: true,
        onTheErrand: true,
      },
    ],
    companies: { [ERICAS_PARTY_ID]: [{ organizationNumber: DRIVEN, name: 'Drivet AB' }] },
  });

  expect(parameters.representatives).toEqual([
    {
      personalNumber: hyphenatedIdentity(ERICAS_IDENTITY),
      name: 'Erica Fritz',
      companies: [{ name: 'Drivet AB', orgNumber: mockEnv.mockOrganizationNumber }],
    },
  ]);
});

// A template that names no people, so the card is not busy reading company data while this is tried.
const chooseTheGeneralTemplate = () => chooseTemplate('referral-general');

test('a referral saved before it was sent opens with the template it was written from', () => {
  // The question of a statement that is saved but has no document written from it yet.
  mountCard(true, 'Skatteverket', { question: 'Begäran Skatteverket, serveringstillstånd' });

  expect((findOf('statement-template') as HTMLSelectElement).value).toBe('tax-agency-request-serving');
});

test('a form the counterparty fills in by hand is offered no free text at all', () => {
  mountCard();
  chooseTheTaxAgencyTemplate();

  expect(findOf('statement-free-text')).toBeNull();
  expect(findOf('statement-apply-free-text')).toBeNull();
});

test('the free text is written back under its own name, as another field of the referral', () => {
  mountCard();
  chooseTheGeneralTemplate();

  fireEvent.change(findOf('statement-free-text') as HTMLTextAreaElement, {
    target: { value: 'Lokalen är nybyggd.' },
  });

  expect(formChanged).toHaveBeenLastCalledWith({ freeText: 'Lokalen är nybyggd.' });
});

test('the preview renders the free text that was applied, not every keystroke on the way there', () => {
  mountCard(true, 'Skatteverket', { freeText: 'Lokalen är nybyggd.' });
  chooseTheGeneralTemplate();

  // What the referral was saved with is what it previews as, without a click of its own.
  expect(preview.parameters?.additionalText).toBe('Lokalen är nybyggd.');

  fireEvent.change(findOf('statement-free-text') as HTMLTextAreaElement, {
    target: { value: 'Lokalen är ombyggd.' },
  });
  expect(preview.parameters?.additionalText).toBe('Lokalen är nybyggd.');

  fireEvent.click(findOf('statement-apply-free-text') as HTMLButtonElement);
  expect(preview.parameters?.additionalText).toBe('Lokalen är ombyggd.');
});

test('a referral of its own is named instead of templated, and has no document to generate', () => {
  mountCard(true, 'Annan instans');

  expect(findOf('statement-document-name')).toBeTruthy();
  expect(findOf('statement-template')).toBeNull();
  expect(findOf('statement-generate')).toBeNull();
  expect(findOf('statement-free-text')).toBeNull();

  // The fields every referral carries are the same ones.
  expect(findOf('statement-upload')).toBeTruthy();
  expect(findOf('statement-sent-at')).toBeTruthy();
  expect(findOf('statement-responded-at')).toBeTruthy();
  expect(findOf('statement-outcome')).toBeTruthy();
  expect(findOf('statement-response-text')).toBeTruthy();
});

test('what the handler calls the document is written back as the name of the referral', () => {
  mountCard(true, 'Annan instans');

  fireEvent.change(findOf('statement-document-name') as HTMLInputElement, {
    target: { value: 'Yttrande från fastighetsägaren' },
  });

  expect(formChanged).toHaveBeenLastCalledWith({ label: 'Yttrande från fastighetsägaren' });
});

test('a referral of its own files what the handler says the file is', () => {
  mountCard(true, 'Annan instans');

  expect((findOf('statement-upload') as HTMLElement).textContent).toBe('common:statements.upload_attachment');
  expect((findOf('statement-upload-kind-request') as HTMLInputElement).checked).toBe(true);

  fireEvent.click(findOf('statement-upload-kind-response') as HTMLInputElement);

  expect((findOf('statement-upload-kind-response') as HTMLInputElement).checked).toBe(true);
});

test('a referral of its own that carries a document is named once and for all', () => {
  withAnUnderlay({
    id: 'st-1',
    type: 'REFERRAL',
    status: 'DRAFT',
    attachments: [{ id: 'a1', fileName: 'Yttrande.pdf', purpose: { name: 'STATEMENT_REQUEST' } }],
  });

  expect((findOf('statement-document-name') as HTMLInputElement).disabled).toBe(true);
  expect((findOf('statement-counterparty') as HTMLSelectElement).disabled).toBe(true);
  // Nothing has answered it yet, so it is still a referral the handler can take back.
  expect((findOf('statement-remove') as HTMLButtonElement).disabled).toBe(false);
});

test('a referral of its own that has been answered cannot be taken back', () => {
  withAnUnderlay({
    id: 'st-1',
    type: 'REFERRAL',
    status: 'COMPLETED',
    attachments: [{ id: 'a2', fileName: 'Svar.pdf', purpose: { name: 'STATEMENT_RESPONSE' } }],
  });

  expect((findOf('statement-document-name') as HTMLInputElement).disabled).toBe(true);
  expect((findOf('statement-remove') as HTMLButtonElement).disabled).toBe(true);
});
