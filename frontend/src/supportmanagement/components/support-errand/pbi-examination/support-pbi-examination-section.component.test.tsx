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
import { SupportPbiExaminationSection } from './support-pbi-examination-section.component';

vi.mock('@common/components/file-upload/file-upload.component', () => ({ imageMimeTypes: [], documentMimeTypes: [] }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@common/components/dynamic-text-editor', () => ({
  default: ({ value }: { value: { markup?: string } }) => <div data-cy="editor">{value.markup}</div>,
}));
vi.mock('@common/components/use-text-editor-placeholder', () => ({ useTextEditorPlaceholder: () => undefined }));
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

const fieldOf = (part: string) => document.querySelector(`[data-cy="${part}-${EDWIN}"]`) as HTMLInputElement;

const saveRef: { current: (() => Promise<boolean>) | undefined } = { current: undefined };

const theSection = (writable: boolean) => (
  <SupportPbiExaminationSection
    section={{ id: 's1', sectionKey: 'persons_of_influence', text: '' }}
    investigationId="i1"
    writable={writable}
    onEdited={vi.fn()}
    onSaved={vi.fn()}
    saveRef={saveRef}
  />
);

const mountSection = (writable = true) => render(theSection(writable));

beforeEach(() => {
  vi.clearAllMocks();
  form.customer = [];
  form.contacts = [edwin];
  useSupportStore.setState({ supportErrand: { id: 'e1', status: 'ONGOING', stakeholders: [] } as never });
  useUserStore.setState({ user: { permissions: { canEditSupportManagement: true } } } as never);
});

afterEach(cleanup);

test('the section carries the ownership of the company, written as its own text', () => {
  mountSection();

  expect(document.querySelector('[data-cy="persons_of_influence-text"]')).toBeTruthy();
});

test('one card per marked person, carrying the motivation and both examinations', () => {
  mountSection();

  expect(screen.getByText('Edwin Molina')).toBeTruthy();
  expect(screen.getByText(`${hyphenatedIdentity(mockEnv.mockPersonNumber)} · Verkställande direktör`)).toBeTruthy();
  expect(document.querySelectorAll(`[data-cy="pbi-examination-${EDWIN}"]`).length).toBe(1);
  expect(fieldOf('pbi-motivation')).toBeTruthy();
  expect(fieldOf('suitability-assessment')).toBeTruthy();
  expect(fieldOf('knowledge-test-status')).toBeTruthy();
  expect(fieldOf('knowledge-test-date')).toBeTruthy();
  expect(document.querySelector('[data-cy="pbi-examination-empty"]')).toBeNull();
});

test('a verdict is written onto the stakeholder in the form, where Spara ärende picks it up', () => {
  // The form is mocked, so the re-render that watch() would cause is done by hand between the two edits.
  const { rerender } = mountSection();

  fireEvent.change(fieldOf('suitability-assessment'), { target: { value: 'DEFICIENCY' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('suitability-comment'), { target: { value: 'Skuld hos Kronofogden.' } });

  expect(setValue).toHaveBeenCalledWith('contacts', expect.anything(), { shouldDirty: true, shouldValidate: true });
  expect(pbiOf(form.contacts[0])).toMatchObject({
    source: 'COMPANY',
    role: 'Verkställande direktör',
    assessment: 'DEFICIENCY',
    comment: 'Skuld hos Kronofogden.',
  });
});

test('the motivation is written onto the stakeholder in the form, beside the verdict', () => {
  const { rerender } = mountSection();

  fireEvent.change(fieldOf('suitability-assessment'), { target: { value: 'APPROVED' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('pbi-motivation'), { target: { value: 'Driver verksamheten dagligen.' } });

  expect(pbiOf(form.contacts[0])).toMatchObject({
    role: 'Verkställande direktör',
    motivation: 'Driver verksamheten dagligen.',
    assessment: 'APPROVED',
  });
});

test('the knowledge test is written onto the stakeholder in the form, where Spara ärende picks it up', () => {
  const { rerender } = mountSection();

  fireEvent.change(fieldOf('knowledge-test-status'), { target: { value: 'APPROVED' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('knowledge-test-date'), { target: { value: '2026-10-02' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('knowledge-test-comment'), { target: { value: 'Bokat till torsdag.' } });

  expect(pbiOf(form.contacts[0]).knowledgeTest).toEqual({
    status: 'APPROVED',
    testedAt: '2026-10-02',
    comment: 'Bokat till torsdag.',
  });
});

test('the two examinations sit on one card without overwriting each other', () => {
  const { rerender } = mountSection();

  fireEvent.change(fieldOf('suitability-assessment'), { target: { value: 'APPROVED' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('knowledge-test-status'), { target: { value: 'BOOKED' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('suitability-comment'), { target: { value: 'Ingen anmärkning i yttrandet.' } });

  expect(pbiOf(form.contacts[0])).toMatchObject({
    source: 'COMPANY',
    role: 'Verkställande direktör',
    assessment: 'APPROVED',
    comment: 'Ingen anmärkning i yttrandet.',
    knowledgeTest: { status: 'BOOKED', testedAt: '', comment: '' },
  });
});

test('a space survives being typed, although the field reads its value back out of the parameter', () => {
  const { rerender } = mountSection();
  const press = (key: string, field: string) => {
    const before = fieldOf(field).value;
    fireEvent.change(fieldOf(field), { target: { value: before + key } });
    rerender(theSection(true));
    return fieldOf(field).value;
  };

  expect(press('a', 'suitability-comment')).toBe('a');
  expect(press(' ', 'suitability-comment')).toBe('a ');
  expect(press('b', 'suitability-comment')).toBe('a b');

  expect(press('c', 'knowledge-test-comment')).toBe('c');
  expect(press(' ', 'knowledge-test-comment')).toBe('c ');
  expect(press('d', 'knowledge-test-comment')).toBe('c d');
});

test('a comment without a verdict is pointed out on the card', () => {
  form.contacts = [withAssessment(edwin, { assessment: '', comment: 'Skuld.' })];
  mountSection();

  expect(fieldOf('suitability-problem').textContent).toBe('common:personal_suitability.validation.assessment_required');
});

test('a status cleared is a status the errand no longer carries, while the verdict and the date stay', () => {
  form.contacts = [
    withKnowledgeTest(withAssessment(edwin, { assessment: 'APPROVED', comment: '' }), {
      status: 'BOOKED',
      testedAt: '2026-10-02',
      comment: '',
    }),
  ];
  mountSection();

  fireEvent.change(fieldOf('knowledge-test-status'), { target: { value: '' } });

  expect(form.contacts[0].parameters?.map((parameter) => parameter.key)).not.toContain('PBI_KNOWLEDGE_TEST');
  expect(pbiOf(form.contacts[0]).knowledgeTest).toEqual({ status: '', testedAt: '2026-10-02', comment: '' });
  expect(pbiOf(form.contacts[0]).assessment).toBe('APPROVED');
});

test('nobody marked shows the empty notice, and a read-only section offers no way to add', () => {
  form.contacts = [];
  mountSection(false);

  expect(document.querySelector('[data-cy="pbi-examination-empty"]')).toBeTruthy();
  expect(document.querySelector('[data-cy="pbi-add-open"]')).toBeNull();
});
