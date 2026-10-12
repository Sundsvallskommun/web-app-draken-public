// @vitest-environment jsdom
import { useSupportStore, useUserStore } from '@stores/index';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import {
  hyphenatedIdentity,
  pbiOf,
  withAssessment,
  withKnowledgeTest,
  withPbi,
} from '@supportmanagement/services/support-pbi-service';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportKnowledgeTestSection } from './support-knowledge-test-section.component';

vi.mock('@common/components/file-upload/file-upload.component', () => ({ imageMimeTypes: [], documentMimeTypes: [] }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@common/services/legal-entity-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLegalEntityEngagements: vi.fn().mockResolvedValue([]),
}));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));

const form: { customer: SupportStakeholderFormModel[]; contacts: SupportStakeholderFormModel[] } = {
  customer: [],
  contacts: [],
};
const setValue = vi.fn((name: 'customer' | 'contacts', value: SupportStakeholderFormModel[]) => {
  form[name] = value;
});
vi.mock('react-hook-form', () => ({
  useFormContext: () => ({ watch: (name: 'customer' | 'contacts') => form[name], setValue }),
}));

const EDWIN = 'edwin';

const edwin = withAssessment(
  withPbi(
    {
      internalId: EDWIN,
      externalId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
      externalIdType: 'PRIVATE',
      role: 'CONTACT',
      firstName: 'Edwin',
      lastName: 'Molina',
      personNumber: mockEnv.mockPersonNumber,
      emails: [],
      phoneNumbers: [],
      parameters: [],
    } as never,
    { source: 'COMPANY', role: 'Verkställande direktör' }
  ),
  { assessment: 'APPROVED', comment: '' }
);

const fieldOf = (part: string) =>
  document.querySelector(`[data-cy="knowledge-test-${part}-${EDWIN}"]`) as HTMLInputElement;

const mountSection = (writable = true) => render(<SupportKnowledgeTestSection writable={writable} />);

beforeEach(() => {
  vi.clearAllMocks();
  form.customer = [];
  form.contacts = [edwin];
  useSupportStore.setState({ supportErrand: { id: 'e1', status: 'ONGOING', stakeholders: [] } as never });
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
});

afterEach(cleanup);

test('a card per marked person, with the personal number written the way a form is read and the role beside it', () => {
  mountSection();

  expect(screen.getByText('Edwin Molina')).toBeTruthy();
  expect(screen.getByText(`${hyphenatedIdentity(mockEnv.mockPersonNumber)} · Verkställande direktör`)).toBeTruthy();
  expect(document.querySelector('[data-cy="knowledge-test-empty"]')).toBeNull();
});

test('the knowledge test is written onto the stakeholder in the form, where Spara ärende picks it up', () => {
  // The form is mocked, so the re-render that watch() would cause is done by hand between the edits.
  const { rerender } = mountSection();

  fireEvent.change(fieldOf('status'), { target: { value: 'APPROVED' } });
  rerender(<SupportKnowledgeTestSection writable={true} />);
  fireEvent.change(fieldOf('date'), { target: { value: '2026-10-02' } });
  rerender(<SupportKnowledgeTestSection writable={true} />);
  fireEvent.change(fieldOf('comment'), { target: { value: 'Bokat till torsdag.' } });

  expect(setValue).toHaveBeenCalledWith('contacts', expect.anything(), { shouldDirty: true, shouldValidate: true });
  expect(pbiOf(form.contacts[0])).toMatchObject({
    source: 'COMPANY',
    role: 'Verkställande direktör',
    assessment: 'APPROVED',
    knowledgeTest: { status: 'APPROVED', testedAt: '2026-10-02', comment: 'Bokat till torsdag.' },
  });
});

test('a status cleared is a status the errand no longer carries, while the date stays', () => {
  form.contacts = [withKnowledgeTest(edwin, { status: 'BOOKED', testedAt: '2026-10-02', comment: '' })];
  mountSection();

  fireEvent.change(fieldOf('status'), { target: { value: '' } });

  expect(form.contacts[0].parameters?.map((parameter) => parameter.key)).not.toContain('PBI_KNOWLEDGE_TEST');
  expect(pbiOf(form.contacts[0]).knowledgeTest).toEqual({ status: '', testedAt: '2026-10-02', comment: '' });
});

test('nobody marked shows the empty notice, and a read-only section offers no way to add', () => {
  form.contacts = [];
  mountSection(false);

  expect(document.querySelector('[data-cy="knowledge-test-empty"]')).toBeTruthy();
  expect(document.querySelector('[data-cy="pbi-add-open"]')).toBeNull();
});
