// @vitest-environment jsdom
import { useSupportStore, useUserStore } from '@stores/index';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import { hyphenatedIdentity, pbiOf, withAssessment, withPbi } from '@supportmanagement/services/support-pbi-service';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportPersonalSuitabilitySection } from './support-personal-suitability-section.component';

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

const edwin = withPbi(
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
);

const fieldOf = (part: string) => document.querySelector(`[data-cy="suitability-${part}-${EDWIN}"]`) as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  form.customer = [];
  form.contacts = [edwin];
  useSupportStore.setState({ supportErrand: { id: 'e1', status: 'ONGOING', stakeholders: [] } as never });
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
});

afterEach(cleanup);

test('a card per marked person, with the personal number written the way a form is read and the role beside it', () => {
  render(<SupportPersonalSuitabilitySection writable={true} />);

  expect(screen.getByText('Edwin Molina')).toBeTruthy();
  expect(screen.getByText(`${hyphenatedIdentity(mockEnv.mockPersonNumber)} · Verkställande direktör`)).toBeTruthy();
  expect(document.querySelector('[data-cy="suitability-empty"]')).toBeNull();
});

test('a verdict is written onto the stakeholder in the form, where Spara ärende picks it up', () => {
  // The form is mocked, so the re-render that watch() would cause is done by hand between the two edits.
  const { rerender } = render(<SupportPersonalSuitabilitySection writable={true} />);

  fireEvent.change(fieldOf('assessment'), { target: { value: 'DEFICIENCY' } });
  rerender(<SupportPersonalSuitabilitySection writable={true} />);
  fireEvent.change(fieldOf('comment'), { target: { value: 'Skuld hos Kronofogden.' } });

  expect(setValue).toHaveBeenCalledWith('contacts', expect.anything(), { shouldDirty: true, shouldValidate: true });
  expect(pbiOf(form.contacts[0])).toMatchObject({
    source: 'COMPANY',
    role: 'Verkställande direktör',
    assessment: 'DEFICIENCY',
    comment: 'Skuld hos Kronofogden.',
  });
});

test('a comment without a verdict is pointed out on the card', () => {
  form.contacts = [withAssessment(edwin, { assessment: '', comment: 'Skuld.' })];
  render(<SupportPersonalSuitabilitySection writable={true} />);

  expect(fieldOf('problem').textContent).toBe('common:personal_suitability.validation.assessment_required');
});

test('nobody marked shows the empty notice, and a read-only section offers no way to add', () => {
  form.contacts = [];
  render(<SupportPersonalSuitabilitySection writable={false} />);

  expect(document.querySelector('[data-cy="suitability-empty"]')).toBeTruthy();
  expect(document.querySelector('[data-cy="pbi-add-open"]')).toBeNull();
});
