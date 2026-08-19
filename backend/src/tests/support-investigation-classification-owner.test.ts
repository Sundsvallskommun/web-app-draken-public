import {
  preservesSupportInvestigationClassificationSelectorParameter,
  ReportedMisconductInvestigationClassificationPolicy,
  resolveSupportInvestigationClassificationOwner,
} from '@/services/support-investigation-classification-owner';

const policy: ReportedMisconductInvestigationClassificationPolicy = {
  strategy: 'reported-misconduct',
  defaultOwnerDocumentKey: 'manager-investigation',
  reportedMisconductOwnerDocumentKey: 'social-investigation',
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
  legalBaseRules: [],
};

const parameter = (key: string, ...values: string[]) => ({ key, values });

describe('generic investigation classification policy', () => {
  it('uses the policy selector and returns future profile keys without application branches', () => {
    expect(
      resolveSupportInvestigationClassificationOwner(policy, {
        parameters: [parameter('eventType', 'MISSFORHALLANDE')],
      }),
    ).toEqual({ strategy: 'reported-misconduct', mode: 'reported-misconduct', documentKey: 'social-investigation' });
    expect(
      resolveSupportInvestigationClassificationOwner(policy, {
        parameters: [parameter('eventType', 'AVVIKELSE')],
      }),
    ).toEqual({ strategy: 'reported-misconduct', mode: 'default', documentKey: 'manager-investigation' });
  });

  it('treats resourcePath as authoritative and resourceName only as a legacy fallback', () => {
    expect(
      resolveSupportInvestigationClassificationOwner(policy, {
        labels: [{ id: 'wrong-path', resourcePath: 'OTHER/ABUSE', resourceName: 'ABUSE' }],
      }),
    ).toMatchObject({ mode: 'default', documentKey: 'manager-investigation' });
    expect(
      resolveSupportInvestigationClassificationOwner(policy, {
        labels: [{ id: 'legacy', resourceName: 'ABUSE' }],
      }),
    ).toMatchObject({ mode: 'reported-misconduct', documentKey: 'social-investigation' });
  });

  it('allows an unchanged owner selector while unrelated parameters change', () => {
    expect(
      preservesSupportInvestigationClassificationSelectorParameter(
        policy,
        [parameter('eventType', 'AVVIKELSE'), parameter('other', 'before')],
        [parameter('eventType', 'AVVIKELSE'), parameter('other', 'after')],
      ),
    ).toBe(true);
  });

  it.each([
    [[parameter('eventType', 'AVVIKELSE')], [parameter('eventType', 'MISSFORHALLANDE')]],
    [[parameter('eventType', 'AVVIKELSE')], []],
    [[], [parameter('eventType', 'AVVIKELSE')]],
    [[parameter('eventType', 'AVVIKELSE')], [parameter('eventType', 'AVVIKELSE'), parameter('eventType', 'AVVIKELSE')]],
    [[parameter('eventType', 'AVVIKELSE')], [parameter('eventType', 'AVVIKELSE'), parameter(' eventType ', 'MISSFORHALLANDE')]],
  ])('rejects an owner-selector addition, removal, mutation or duplicate', (current, requested) => {
    expect(preservesSupportInvestigationClassificationSelectorParameter(policy, current, requested)).toBe(false);
  });
});
