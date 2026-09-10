import { expect, test, vi } from 'vitest';

import {
  investigationClassificationWriteBlock,
  prepareInvestigationClassification,
} from './support-investigation-save-workflow';

const input = () => ({
  required: true,
  canEditClassification: false,
  dirty: false,
  labelTree: {
    root: { resource: 'CATEGORY', classification: 'CATEGORY_ROOT' },
    ownerClassification: 'PROVISION_CATEGORY',
    categoryClassification: 'CATEGORY',
    typeClassification: 'TYPE',
  },
  labelStructure: [
    {
      classification: 'CATEGORY_ROOT',
      resourceName: 'CATEGORY',
      resourcePath: 'CATEGORY',
      labels: [
        {
          classification: 'PROVISION_CATEGORY',
          resourceName: 'SOL_LSS',
          resourcePath: 'CATEGORY/SOL_LSS',
          labels: [
            {
              classification: 'CATEGORY',
              resourceName: 'CURRENT',
              resourcePath: 'CATEGORY/SOL_LSS/CURRENT',
              labels: [],
            },
          ],
        },
      ],
    },
  ],
  legalBases: ['SOL'],
  legalBaseRules: [
    { legalBase: 'SOL', allowedClassificationCategories: ['CATEGORY/SOL_LSS'] },
    { legalBase: 'HSL', allowedClassificationCategories: ['CATEGORY/HSL'] },
  ],
  persistedClassification: {
    labels: [],
    category: 'CATEGORY/SOL_LSS',
    type: 'CATEGORY/SOL_LSS/CURRENT',
    subType: '',
    classificationHasSubTypes: false,
  },
  triggerValidation: vi.fn(async () => true),
  getDraft: vi.fn(() => ({
    labels: [],
    category: 'CATEGORY/SOL_LSS',
    type: 'CATEGORY/SOL_LSS/CURRENT',
    subType: '',
    classificationHasSubTypes: false,
  })),
});

test('a document editor can save without changing a valid existing classification', async () => {
  const request = input();
  expect(investigationClassificationWriteBlock(request)).toBeUndefined();
  expect(await prepareInvestigationClassification(request)).toBeUndefined();
  expect(request.getDraft).not.toHaveBeenCalled();
});

test('a legal-base change requiring a forbidden reclassification is blocked before editing and at save', async () => {
  const request = { ...input(), legalBases: ['HSL'] };
  expect(investigationClassificationWriteBlock(request)).toContain('saknar behörighet');
  await expect(prepareInvestigationClassification(request)).rejects.toThrow('saknar behörighet');
});

test('missing classification is explained without asking the editor to fix a disabled control', async () => {
  const request = input();
  request.persistedClassification.type = '';
  await expect(prepareInvestigationClassification(request)).rejects.toThrow('behörig handläggare');
  expect(request.triggerValidation).not.toHaveBeenCalled();
});

test('classification drafts cannot be saved after the classification permission is revoked', async () => {
  const request = { ...input(), dirty: true };
  await expect(prepareInvestigationClassification(request)).rejects.toThrow('ändrad kategorisering');
});

test('documents which do not own classification do not require classification permission', async () => {
  expect(await prepareInvestigationClassification({ ...input(), required: false, dirty: true })).toBeUndefined();
});
