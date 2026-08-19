import { assertSupportInvestigationClassificationContext } from '@/services/support-investigation-classification-context.service';
import type { ReportedMisconductInvestigationClassificationPolicy } from '@/services/support-investigation-classification-owner';

const policy: ReportedMisconductInvestigationClassificationPolicy = {
  strategy: 'reported-misconduct',
  defaultOwnerDocumentKey: 'manager-document',
  reportedMisconductOwnerDocumentKey: 'social-document',
  reportedMisconductSelector: {
    parameter: { key: 'eventType', values: ['MISSFORHALLANDE'] },
    labels: { resourcePaths: ['REPORT_TYPE/ABUSE'], resourceNames: ['ABUSE'] },
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
};

const classification = (category: string) => ({ category, type: `${category}/CATEGORY` });
const document = (...legalBases: string[]) => ({ legalBases });
const owner = (mode: 'default' | 'reported-misconduct', documentKey = 'manager-document') => ({
  strategy: 'reported-misconduct' as const,
  mode,
  documentKey,
});

describe('assertSupportInvestigationClassificationContext', () => {
  it.each([
    [['HSL'], 'CATEGORY/HSL'],
    [['SOL'], 'CATEGORY/SOL_LSS'],
    [['LSS'], 'CATEGORY/SOL_LSS'],
    [['HSL', 'SOL'], 'CATEGORY/HSL'],
    [['HSL', 'SOL'], 'CATEGORY/SOL_LSS'],
  ] as const)('accepts fixed IAF/VOF legal bases %j with their owner %s', (legalBases, category) => {
    expect(() =>
      assertSupportInvestigationClassificationContext(
        policy,
        owner('default'),
        'manager-document',
        document(...legalBases),
        classification(category),
      ),
    ).not.toThrow();
  });

  it('reads legal bases only from the fixed root path', () => {
    expect(() =>
      assertSupportInvestigationClassificationContext(
        policy,
        owner('default'),
        'manager-document',
        { assessment: { legalBases: ['HSL'] } },
        classification('CATEGORY/HSL'),
      ),
    ).toThrow('must contain at least one supported legal base');
  });

  it('rejects a category owned by another legal-base branch', () => {
    expect(() =>
      assertSupportInvestigationClassificationContext(policy, owner('default'), 'manager-document', document('SOL'), classification('CATEGORY/HSL')),
    ).toThrow('incompatible with the investigation legal bases');
  });

  it.each([document(), document('UNKNOWN'), { legalBases: [1] }])('fails closed for missing, unknown or malformed legal bases', value => {
    expect(() =>
      assertSupportInvestigationClassificationContext(policy, owner('default'), 'manager-document', value, classification('CATEGORY/HSL')),
    ).toThrow();
  });

  it('rejects a document that is not the resolved owner for the current errand', () => {
    expect(() =>
      assertSupportInvestigationClassificationContext(
        policy,
        owner('reported-misconduct', 'social-document'),
        'manager-document',
        document('HSL'),
        classification('CATEGORY/HSL'),
      ),
    ).toThrow('does not own classification for this errand');
  });

  it('requires the exact forced legal-base set for reported misconduct even when owner keys are shared', () => {
    const reportedOwner = owner('reported-misconduct');

    expect(() =>
      assertSupportInvestigationClassificationContext(
        policy,
        reportedOwner,
        'manager-document',
        document('SOL', 'LSS'),
        classification('CATEGORY/SOL_LSS'),
      ),
    ).not.toThrow();
    for (const legalBases of [['SOL'], ['SOL', 'LSS', 'HSL'], ['SOL', 'SOL', 'LSS']]) {
      expect(() =>
        assertSupportInvestigationClassificationContext(
          policy,
          reportedOwner,
          'manager-document',
          document(...legalBases),
          classification('CATEGORY/SOL_LSS'),
        ),
      ).toThrow();
    }
  });
});
