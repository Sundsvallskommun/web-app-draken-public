// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { InvestigationConclusionDisclosure } from './investigation-conclusion-disclosure.component';

vi.mock('@common/components/dynamic-text-editor', () => ({
  default: ({
    name,
    value,
    onChange,
    readOnly,
  }: {
    name: string;
    value: { markup?: string };
    onChange: (event: { target: { value: { markup?: string } } }) => void;
    readOnly: boolean;
  }) => (
    <textarea
      data-cy={name}
      readOnly={readOnly}
      value={value.markup ?? ''}
      onChange={(event) => onChange({ target: { value: { markup: event.target.value } } })}
    />
  ),
}));
vi.mock('@common/components/use-text-editor-placeholder', () => ({ useTextEditorPlaceholder: () => undefined }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const set = vi.fn();

const OUTCOMES = [
  { name: 'APPROVAL', displayName: 'Bifall' },
  { name: 'APPROVAL_WITH_CONDITIONS', displayName: 'Bifall med villkor' },
  { name: 'REJECTION', displayName: 'Avslag' },
];

const mount = (readOnly = false, values = { conclusion: '', recommendation: '', recommendationMotivation: '' }) =>
  render(<InvestigationConclusionDisclosure values={values} readOnly={readOnly} set={set} outcomes={OUTCOMES} />);

const fieldOf = (name: string) => document.querySelector(`[data-cy="${name}"]`) as HTMLTextAreaElement;
const proposal = () => document.querySelector('[data-cy="investigation-recommendation"]') as HTMLSelectElement;

beforeEach(() => vi.clearAllMocks());

afterEach(cleanup);

test('the section weighs the assessment, the proposal and its motivation, and asks nothing else', () => {
  mount();

  expect(fieldOf('investigation-conclusion')).toBeTruthy();
  expect(proposal()).toBeTruthy();
  expect(fieldOf('investigation-motivation')).toBeTruthy();

  expect(document.body.textContent).not.toContain('common:investigation.summary');
});

test('the assessment and the motivation are written back under their own names', () => {
  mount();

  fireEvent.change(fieldOf('investigation-conclusion'), { target: { value: 'Sökanden bedöms lämplig.' } });
  expect(set).toHaveBeenLastCalledWith('conclusion', 'Sökanden bedöms lämplig.');

  fireEvent.change(fieldOf('investigation-motivation'), { target: { value: 'Inga brister har konstaterats.' } });
  expect(set).toHaveBeenLastCalledWith('recommendationMotivation', 'Inga brister har konstaterats.');
});

test('the proposal offers the outcomes the namespace has registered, behind a placeholder', () => {
  mount();

  expect([...proposal().options].map((option) => option.value)).toEqual([
    '',
    'APPROVAL',
    'APPROVAL_WITH_CONDITIONS',
    'REJECTION',
  ]);

  fireEvent.change(proposal(), { target: { value: 'APPROVAL_WITH_CONDITIONS' } });
  expect(set).toHaveBeenLastCalledWith('recommendation', 'APPROVAL_WITH_CONDITIONS');
});

test('what was written is what is shown', () => {
  mount(false, {
    conclusion: 'Samlad bedömning.',
    recommendation: 'REJECTION',
    recommendationMotivation: 'Motivering.',
  });

  expect(fieldOf('investigation-conclusion').value).toBe('Samlad bedömning.');
  expect(proposal().value).toBe('REJECTION');
  expect(fieldOf('investigation-motivation').value).toBe('Motivering.');
});

test('a passed step leaves the whole section read only', () => {
  mount(true);

  expect(fieldOf('investigation-conclusion').readOnly).toBe(true);
  expect(proposal().disabled).toBe(true);
  expect(fieldOf('investigation-motivation').readOnly).toBe(true);
});
