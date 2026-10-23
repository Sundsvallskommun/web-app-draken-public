// @vitest-environment jsdom
import {
  getCompanyProfileByPartyId,
  getLegalEntityEngagements,
  getLegalEntityPersonEngagements,
} from '@common/services/legal-entity-service';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  INVESTIGATION_BASIS_TEMPLATE_IDENTIFIER,
  renderInvestigationBasisPreview,
} from '@supportmanagement/services/support-investigation-basis-service';
import { getSupportStatements } from '@supportmanagement/services/support-statement-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { InvestigationBasis } from './investigation-basis.component';

// Translates from the Swedish language file, so the test reads the texts the handler sees.
vi.mock('react-i18next', async () => {
  const sv = (await import('../../../../../../public/locales/sv/common.json')).default;
  const lookup = (key: string) =>
    key
      .replace(/^common:/, '')
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sv);
  const t = (key: string, options?: Record<string, unknown>) => {
    const value = lookup(key);
    return typeof value === 'string'
      ? value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(options?.[name] ?? ''))
      : key;
  };
  return { useTranslation: () => ({ t }) };
});

vi.mock('@common/components/json/hooks/useJsonSchema', () => ({
  useJsonSchema: () => ({ schema: null, loading: false, error: undefined }),
}));

vi.mock('@common/services/legal-entity-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCompanyProfileByPartyId: vi.fn(),
  getLegalEntityEngagements: vi.fn(),
  getLegalEntityPersonEngagements: vi.fn(),
}));

vi.mock('@supportmanagement/services/support-statement-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportStatements: vi.fn(),
}));

vi.mock('@supportmanagement/services/support-investigation-basis-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  renderInvestigationBasisPreview: vi.fn(),
}));

const PARTY_ID = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';

const investigation = {
  id: 'inv-1',
  conclusion: '<p>Kraven är uppfyllda.</p>',
  sections: [{ id: 's1', sectionKey: 'lease', text: '<p>Hyresavtal till 2029.</p>', sortOrder: 5 }],
};

const mount = (unsaved = false) => render(<InvestigationBasis investigation={investigation} unsaved={unsaved} />);

const button = () => document.querySelector('[data-cy="investigation-basis-render"]') as HTMLButtonElement;
const preview = () => document.querySelector('[data-cy="investigation-basis-preview-content"]') as HTMLIFrameElement;

beforeEach(() => {
  vi.clearAllMocks();
  useSupportStore.setState({
    supportErrand: {
      id: 'errand-1',
      errandNumber: 'AOT-26100216',
      assignedUserId: 'anjan',
      customer: [{ internalId: 'owner', externalId: PARTY_ID, organizationName: 'Färjas i Tynderö AB' }],
      contacts: [],
      parameters: [],
    } as never,
    supportAttachments: [],
  });
  useConfigStore.setState({ municipalityId: '2281' } as never);
  useMetadataStore.setState({ supportMetadata: { namespace: 'ALKT' } } as never);
  useUserStore.setState({
    administrators: [{ adAccount: 'anjan', firstName: 'Annika', lastName: 'Jansson', displayName: 'Jansson Annika' }],
  } as never);
  vi.mocked(getSupportStatements).mockResolvedValue([]);
  vi.mocked(getCompanyProfileByPartyId).mockResolvedValue({ form: 'Aktiebolag' });
  vi.mocked(getLegalEntityEngagements).mockResolvedValue([]);
  vi.mocked(getLegalEntityPersonEngagements).mockResolvedValue([]);
  vi.mocked(renderInvestigationBasisPreview).mockResolvedValue(window.btoa('%PDF-1.7'));
});

afterEach(cleanup);

test('nothing is read and nothing is rendered until the handler asks for the underlay', () => {
  mount();

  expect(button().textContent).toBe('Beslutsunderlag');
  expect(preview()).toBeNull();
  expect(renderInvestigationBasisPreview).not.toHaveBeenCalled();
  expect(getSupportStatements).not.toHaveBeenCalled();
});

test('the underlay is rendered from what the errand holds, and the button then offers to update it', async () => {
  mount();

  fireEvent.click(button());

  await waitFor(() => expect(preview()).toBeTruthy());
  expect(preview().getAttribute('src')).toContain(window.btoa('%PDF-1.7'));
  expect(button().textContent).toBe('Uppdatera');

  const parameters = vi.mocked(renderInvestigationBasisPreview).mock.calls[0][0];
  expect(parameters.caseNumber).toBe('AOT-26100216');
  expect(parameters.handlerName).toBe('Annika Jansson');
  expect(parameters.premises.leaseHtml).toBe('<p>Hyresavtal till 2029.</p>');
  expect(parameters.applicant.name).toBe('Färjas i Tynderö AB');
});

test('pressing update renders the underlay as the errand now stands', async () => {
  mount();
  fireEvent.click(button());
  await waitFor(() => expect(preview()).toBeTruthy());

  vi.mocked(renderInvestigationBasisPreview).mockResolvedValue(window.btoa('%PDF-1.7 andra'));
  fireEvent.click(button());

  await waitFor(() => expect(preview().getAttribute('src')).toContain(window.btoa('%PDF-1.7 andra')));
  expect(renderInvestigationBasisPreview).toHaveBeenCalledTimes(2);
});

test('a template that cannot be rendered is told to the handler, named', async () => {
  vi.mocked(renderInvestigationBasisPreview).mockRejectedValue(new Error('404'));
  mount();

  fireEvent.click(button());

  const failure = () => document.querySelector('[data-cy="investigation-basis-preview-error"]');
  await waitFor(() => expect(failure()).toBeTruthy());

  expect(failure()?.textContent).toContain(INVESTIGATION_BASIS_TEMPLATE_IDENTIFIER);
  expect(preview()).toBeNull();
});

test('an unsaved edit keeps the underlay from being rendered, since it would not be in it', () => {
  mount(true);

  expect(button().disabled).toBe(true);
  expect(screen.getByText('Spara ärendet så kommer det du nyss skrev med i underlaget.')).toBeTruthy();
});

test('what the service objected to is told along with the template name', async () => {
  vi.mocked(renderInvestigationBasisPreview).mockRejectedValue({
    response: { data: { message: "Missing parameter 'premises.name'" } },
  });
  mount();

  fireEvent.click(button());

  const failure = () => document.querySelector('[data-cy="investigation-basis-preview-error"]');
  await waitFor(() => expect(failure()).toBeTruthy());

  expect(failure()?.textContent).toContain(INVESTIGATION_BASIS_TEMPLATE_IDENTIFIER);
  expect(failure()?.textContent).toContain("Missing parameter 'premises.name'");
});
