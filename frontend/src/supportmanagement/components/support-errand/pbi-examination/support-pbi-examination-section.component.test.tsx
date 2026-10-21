// @vitest-environment jsdom
import { useSupportStore, useUserStore } from '@stores/index';
import { SupportStakeholderFormModel } from '@supportmanagement/services/support-errand-service';
import {
  emptyKnowledgeTest,
  hyphenatedIdentity,
  type PbiKnowledgeTest,
  pbiOf,
  withAssessment,
  withKnowledgeTests,
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

const testFieldOf = (part: string, number = 1) =>
  document.querySelector(`[data-cy="knowledge-test-${part}-${EDWIN}-${number}"]`) as HTMLInputElement;

const tested = (...tests: PbiKnowledgeTest[]) => withKnowledgeTests(edwin, tests);

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
  expect(fieldOf('knowledge-test-empty')).toBeTruthy();
  expect(fieldOf('knowledge-test-add')).toBeTruthy();
  expect(testFieldOf('status')).toBeNull();
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

test('a knowledge test is added and written onto the stakeholder, where Spara ärende picks it up', () => {
  const { rerender } = mountSection();

  fireEvent.click(fieldOf('knowledge-test-add'));
  rerender(theSection(true));
  fireEvent.change(testFieldOf('type'), { target: { value: 'TASTING' } });
  rerender(theSection(true));
  fireEvent.change(testFieldOf('status'), { target: { value: 'APPROVED' } });
  rerender(theSection(true));
  fireEvent.change(testFieldOf('date'), { target: { value: '2026-10-02' } });
  rerender(theSection(true));
  fireEvent.change(testFieldOf('comment'), { target: { value: 'Godkänt på första försöket.' } });

  expect(pbiOf(form.contacts[0]).knowledgeTests).toEqual([
    { type: 'TASTING', status: 'APPROVED', testedAt: '2026-10-02', comment: 'Godkänt på första försöket.' },
  ]);
});

test('a test the list does not hold is written as the handler wrote it', () => {
  form.contacts = [tested(emptyKnowledgeTest())];
  const { rerender } = mountSection();

  fireEvent.change(testFieldOf('type'), { target: { value: 'OTHER' } });
  rerender(theSection(true));
  fireEvent.change(testFieldOf('own-type'), { target: { value: 'Prov hos annan myndighet' } });
  rerender(theSection(true));

  expect(pbiOf(form.contacts[0]).knowledgeTests[0].type).toBe('Prov hos annan myndighet');
  expect(testFieldOf('own-type').value).toBe('Prov hos annan myndighet');
  expect(testFieldOf('type').value).toBe('OTHER');
});

test('a person sits several tests, and the one removed takes nothing of the others with it', () => {
  form.contacts = [
    tested(
      { type: 'PERMANENT_PUBLIC', status: 'FAILED', testedAt: '2026-09-01', comment: 'För få poäng.' },
      { type: 'TASTING', status: 'APPROVED', testedAt: '2026-11-01', comment: '' }
    ),
  ];
  const { rerender } = mountSection();

  expect(testFieldOf('type', 2).value).toBe('TASTING');

  fireEvent.click(testFieldOf('remove'));
  rerender(theSection(true));

  expect(pbiOf(form.contacts[0]).knowledgeTests).toEqual([
    { type: 'TASTING', status: 'APPROVED', testedAt: '2026-11-01', comment: '' },
  ]);
  expect(testFieldOf('type', 2)).toBeNull();
});

test('the examinations sit on one card without overwriting each other', () => {
  form.contacts = [tested(emptyKnowledgeTest())];
  const { rerender } = mountSection();

  fireEvent.change(fieldOf('suitability-assessment'), { target: { value: 'APPROVED' } });
  rerender(theSection(true));
  fireEvent.change(testFieldOf('status'), { target: { value: 'BOOKED' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('pbi-motivation'), { target: { value: 'Driver verksamheten.' } });
  rerender(theSection(true));
  fireEvent.change(fieldOf('suitability-comment'), { target: { value: 'Ingen anmärkning i yttrandet.' } });

  expect(pbiOf(form.contacts[0])).toMatchObject({
    source: 'COMPANY',
    role: 'Verkställande direktör',
    motivation: 'Driver verksamheten.',
    assessment: 'APPROVED',
    comment: 'Ingen anmärkning i yttrandet.',
    knowledgeTests: [{ type: '', status: 'BOOKED', testedAt: '', comment: '' }],
  });
});

test('a space survives being typed, although the field reads its value back out of the parameter', () => {
  form.contacts = [tested(emptyKnowledgeTest())];
  const { rerender } = mountSection();
  const press = (key: string, field: () => HTMLInputElement) => {
    fireEvent.change(field(), { target: { value: field().value + key } });
    rerender(theSection(true));
    return field().value;
  };
  const suitabilityComment = () => fieldOf('suitability-comment');
  const testComment = () => testFieldOf('comment');
  const ownType = () => testFieldOf('own-type');

  expect(press('a', suitabilityComment)).toBe('a');
  expect(press(' ', suitabilityComment)).toBe('a ');
  expect(press('b', suitabilityComment)).toBe('a b');

  expect(press('c', testComment)).toBe('c');
  expect(press(' ', testComment)).toBe('c ');
  expect(press('d', testComment)).toBe('c d');

  fireEvent.change(testFieldOf('type'), { target: { value: 'OTHER' } });
  rerender(theSection(true));
  expect(press('e', ownType)).toBe('e');
  expect(press(' ', ownType)).toBe('e ');
  expect(press('f', ownType)).toBe('e f');
});

test('a comment without a verdict is pointed out on the card', () => {
  form.contacts = [withAssessment(edwin, { assessment: '', comment: 'Skuld.' })];
  mountSection();

  expect(fieldOf('suitability-problem').textContent).toBe('common:personal_suitability.validation.assessment_required');
});

test('a status cleared is a status the errand no longer carries, while the verdict and the date stay', () => {
  form.contacts = [
    withKnowledgeTests(withAssessment(edwin, { assessment: 'APPROVED', comment: '' }), [
      { type: 'TASTING', status: 'BOOKED', testedAt: '2026-10-02', comment: '' },
    ]),
  ];
  mountSection();

  fireEvent.change(testFieldOf('status'), { target: { value: '' } });

  expect(form.contacts[0].parameters?.map((parameter) => parameter.key)).not.toContain('PBI_KNOWLEDGE_TEST_1_STATUS');
  expect(pbiOf(form.contacts[0]).knowledgeTests).toEqual([
    { type: 'TASTING', status: '', testedAt: '2026-10-02', comment: '' },
  ]);
  expect(pbiOf(form.contacts[0]).assessment).toBe('APPROVED');
});

test('nobody marked shows the empty notice, and a read-only section offers no way to add', () => {
  form.contacts = [];
  mountSection(false);

  expect(document.querySelector('[data-cy="pbi-examination-empty"]')).toBeTruthy();
  expect(document.querySelector('[data-cy="pbi-add-open"]')).toBeNull();
});
