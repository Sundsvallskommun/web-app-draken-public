import { createIafVofInvestigationClassificationPolicy } from '@/config/iaf-vof-investigation-classification';

describe('IAF/VOF investigation classification capability', () => {
  it('builds declarative policy data from concrete profile keys without application or schema-name checks', () => {
    expect(
      createIafVofInvestigationClassificationPolicy({
        defaultOwnerDocumentKey: 'custom-manager-key',
        reportedMisconductOwnerDocumentKey: 'custom-social-key',
      }),
    ).toEqual({
      strategy: 'reported-misconduct',
      defaultOwnerDocumentKey: 'custom-manager-key',
      reportedMisconductOwnerDocumentKey: 'custom-social-key',
      reportedMisconductSelector: {
        parameter: { key: 'eventType', values: ['MISSFORHALLANDE'] },
        labels: {
          resourcePaths: ['REPORT_TYPE/ABUSE', 'REPORT_TYPE/ADVERSE_INCIDENT'],
          resourceNames: ['ABUSE', 'ADVERSE_INCIDENT'],
        },
      },
      labelTree: {
        root: { resource: 'CATEGORY', classification: 'CATEGORY_ROOT' },
        ownerClassification: 'PROVISION_CATEGORY',
        categoryClassification: 'CATEGORY',
        typeClassification: 'TYPE',
      },
      forcedLegalBases: ['SOL', 'LSS'],
      legalBasesPointer: '/legalBases',
      legalBaseRules: [
        { legalBase: 'HSL', allowedClassificationCategories: ['CATEGORY/HSL'] },
        { legalBase: 'SOL', allowedClassificationCategories: ['CATEGORY/SOL_LSS'] },
        { legalBase: 'LSS', allowedClassificationCategories: ['CATEGORY/SOL_LSS'] },
      ],
    });
  });

  it('returns deeply immutable, independent instances', () => {
    const first = createIafVofInvestigationClassificationPolicy({
      defaultOwnerDocumentKey: 'manager',
      reportedMisconductOwnerDocumentKey: 'social',
    });
    const second = createIafVofInvestigationClassificationPolicy({
      defaultOwnerDocumentKey: 'manager',
      reportedMisconductOwnerDocumentKey: 'social',
    });

    expect(first).not.toBe(second);
    expect(first.reportedMisconductSelector).not.toBe(second.reportedMisconductSelector);
    expect(first.labelTree).not.toBe(second.labelTree);
    expect(first.labelTree.root).not.toBe(second.labelTree.root);
    expect(first.legalBaseRules).not.toBe(second.legalBaseRules);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.reportedMisconductSelector)).toBe(true);
    expect(Object.isFrozen(first.reportedMisconductSelector.parameter.values)).toBe(true);
    expect(Object.isFrozen(first.labelTree)).toBe(true);
    expect(Object.isFrozen(first.labelTree.root)).toBe(true);
    expect(first.legalBaseRules.every(rule => Object.isFrozen(rule) && Object.isFrozen(rule.allowedClassificationCategories))).toBe(true);
  });
});
