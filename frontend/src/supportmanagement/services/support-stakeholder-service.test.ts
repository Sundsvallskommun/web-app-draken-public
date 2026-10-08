import { expect, test, vi } from 'vitest';

vi.mock('@common/components/file-upload/file-upload.component', () => ({
  imageMimeTypes: [],
  documentMimeTypes: [],
}));

import { SupportStakeholderFormModel } from './support-errand-service';
import { buildStakeholdersList } from './support-stakeholder-service';

const contactWith = (parameters: { key: string; values: string[] }[]): SupportStakeholderFormModel =>
  ({
    internalId: '1',
    externalId: 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11',
    externalIdType: 'PRIVATE',
    firstName: 'Jeppe',
    lastName: 'Jeppsson',
    emails: [],
    phoneNumbers: [],
    parameters,
  } as never);

const keysOf = (parameters: { key: string }[] | undefined) => (parameters ?? []).map((parameter) => parameter.key);

test('a verdict written outside the form survives saving the errand', () => {
  const [stakeholder] = buildStakeholdersList({
    contacts: [
      contactWith([
        { key: 'PBI', values: ['true'] },
        { key: 'PBI_SOURCE', values: ['MANUAL'] },
        { key: 'PBI_ROLE', values: ['Finansiär'] },
        { key: 'PBI_ASSESSMENT', values: ['DEFICIENCY'] },
        { key: 'PBI_ASSESSMENT_COMMENT', values: ['Skuld hos Kronofogden.'] },
      ]),
    ],
  } as never);

  expect(keysOf(stakeholder.parameters)).toEqual([
    'PBI',
    'PBI_SOURCE',
    'PBI_ROLE',
    'PBI_ASSESSMENT',
    'PBI_ASSESSMENT_COMMENT',
  ]);
});

test('a parameter the form writes from its own fields is rebuilt, not carried over', () => {
  const contact = contactWith([{ key: 'title', values: ['Gammal titel'] }]);

  const [stakeholder] = buildStakeholdersList({ contacts: [{ ...contact, title: 'Ny titel' }] } as never);

  expect(stakeholder.parameters).toContainEqual({ key: 'title', values: ['Ny titel'], displayName: 'Titel' });
  expect(stakeholder.parameters?.filter((parameter) => parameter.key === 'title')).toHaveLength(1);
});

test('a form field the handler cleared is not brought back by what the stakeholder used to hold', () => {
  const [stakeholder] = buildStakeholdersList({
    contacts: [{ ...contactWith([{ key: 'title', values: ['Gammal titel'] }]), title: '' }],
  } as never);

  expect(keysOf(stakeholder.parameters)).not.toContain('title');
});
