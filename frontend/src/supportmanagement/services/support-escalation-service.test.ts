import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test, vi } from 'vitest';

import type { SupportErrand } from './support-errand-service';
import { getEscalationEmails } from './support-escalation-service';
import type { SupportMetadata } from './support-metadata-service';

vi.mock('@supportmanagement/components/templates/escalation-template', () => ({
  buildEscalationEmailContent: vi.fn(),
}));

const label = (id: string, classification: string, labels: Label[] = [], escalationEmail?: string): Label => ({
  id,
  classification,
  resourceName: id,
  resourcePath: id,
  displayName: id,
  labels,
  ...(escalationEmail !== undefined && { attributes: [{ key: 'escalationEmail', value: escalationEmail }] }),
});

/** The copy an errand stores: no children and no attributes. */
const errandLabel = (id: string, classification: string): Label => ({
  id,
  classification,
  resourceName: id,
  resourcePath: id,
  displayName: id,
});

const errandWithLabels = (labels: Label[], legacy: Partial<SupportErrand> = {}) =>
  ({ labels, ...legacy } as unknown as SupportErrand);

const metadataWithStructure = (labelStructure: Label[], categories: SupportMetadata['categories'] = []) =>
  ({ labels: { labelStructure }, categories } as unknown as SupportMetadata);

// KS: DEPARTMENT > CATEGORY > TYPE.
const ksErrand = () =>
  errandWithLabels([
    errandLabel('CATEGORIZATION_ROOT', 'ROOT'),
    errandLabel('KSK', 'DEPARTMENT'),
    errandLabel('SERVICE', 'CATEGORY'),
    errandLabel('PASSWORD', 'TYPE'),
  ]);

const ksStructure = (emails: { department?: string; category?: string; type?: string }) => [
  label(
    'KSK',
    'DEPARTMENT',
    [label('SERVICE', 'CATEGORY', [label('PASSWORD', 'TYPE', [], emails.type)], emails.category)],
    emails.department
  ),
];

describe('getEscalationEmails', () => {
  test("prefers the type's email over its category's and department's", async () => {
    const metadata = metadataWithStructure(
      ksStructure({ department: 'ksk@example.com', category: 'service@example.com', type: 'password@example.com' })
    );

    expect(await getEscalationEmails(ksErrand(), metadata)).toEqual([
      { label: 'PASSWORD', value: 'password@example.com' },
    ]);
  });

  test("falls back to the category's email when the type has none", async () => {
    const metadata = metadataWithStructure(
      ksStructure({ department: 'ksk@example.com', category: 'service@example.com' })
    );

    expect(await getEscalationEmails(ksErrand(), metadata)).toEqual([
      { label: 'SERVICE', value: 'service@example.com' },
    ]);
  });

  test("falls back to the department's email when no lower level has one", async () => {
    const metadata = metadataWithStructure(ksStructure({ department: 'ksk@example.com', type: '' }));

    expect(await getEscalationEmails(ksErrand(), metadata)).toEqual([{ label: 'KSK', value: 'ksk@example.com' }]);
  });

  test("prefers the subtype's email when the structure starts at CATEGORY", async () => {
    const metadata = metadataWithStructure([
      label(
        'SALARY',
        'CATEGORY',
        [label('PAYSLIP', 'TYPE', [label('WRONG', 'SUBTYPE', [], 'wrong@example.com')], 'payslip@example.com')],
        'salary@example.com'
      ),
    ]);
    const errand = errandWithLabels([
      errandLabel('SALARY', 'CATEGORY'),
      errandLabel('PAYSLIP', 'TYPE'),
      errandLabel('WRONG', 'SUBTYPE'),
    ]);

    expect(await getEscalationEmails(errand, metadata)).toEqual([{ label: 'WRONG', value: 'wrong@example.com' }]);
  });

  test('falls back to the legacy category/type email when no label has one', async () => {
    const metadata = metadataWithStructure(ksStructure({}), [
      {
        name: 'IAF',
        types: [{ name: 'ADULT_EDUCATION', displayName: 'Vuxenutbildning', escalationEmail: 'legacy@example.com' }],
      },
    ] as SupportMetadata['categories']);
    const errand = errandWithLabels(ksErrand().labels ?? [], { category: 'IAF', type: 'ADULT_EDUCATION' });

    expect(await getEscalationEmails(errand, metadata)).toEqual([
      { label: 'Vuxenutbildning', value: 'legacy@example.com' },
    ]);
  });

  test('returns nothing when neither the labels nor the legacy model carry an email', async () => {
    expect(await getEscalationEmails(ksErrand(), metadataWithStructure(ksStructure({})))).toEqual([]);
  });
});
