import {
  IAF_VOF_INVESTIGATION_CLASSIFICATION_LABEL_TREE,
  IAF_VOF_INVESTIGATION_CLASSIFICATION_LEGAL_BASE_RULES,
  IAF_VOF_INVESTIGATION_LEGAL_BASES_POINTER,
  IAF_VOF_REPORTED_MISCONDUCT_FORCED_LEGAL_BASES,
  preservesIafVofInvestigationClassificationOwnerParameter,
  resolveIafVofInvestigationClassificationOwner,
  resolveIafVofInvestigationClassificationPolicy,
  resolveIafVofInvestigationDocumentApplicability,
} from '@/config/iaf-vof-investigation-classification';
import { createSupportInvestigationProfile, getSupportInvestigationProfile } from '@/config/support-investigation-profile';

const customProfile = (application = 'IAF') =>
  createSupportInvestigationProfile({
    application,
    documents: [
      { key: 'manager-document', schemaName: 'utredning-enhetschef', tabLabel: 'Manager', ownerLabel: 'Manager' },
      { key: 'social-document', schemaName: 'utredning-sol-lss', tabLabel: 'Social', ownerLabel: 'Investigator' },
    ],
  });

describe('fixed IAF/VOF investigation classification policy', () => {
  it.each(['IAF', 'VOF'])('resolves fixed schema roles to profile persistence keys for %s', application => {
    expect(resolveIafVofInvestigationClassificationPolicy(customProfile(application))).toEqual({
      defaultOwnerDocumentKey: 'manager-document',
      reportedMisconductOwnerDocumentKey: 'social-document',
      labelTree: IAF_VOF_INVESTIGATION_CLASSIFICATION_LABEL_TREE,
      forcedLegalBases: IAF_VOF_REPORTED_MISCONDUCT_FORCED_LEGAL_BASES,
      legalBasesPointer: IAF_VOF_INVESTIGATION_LEGAL_BASES_POINTER,
      legalBaseRules: IAF_VOF_INVESTIGATION_CLASSIFICATION_LEGAL_BASE_RULES,
    });
  });

  it('does not apply IAF/VOF behavior to another application', () => {
    expect(resolveIafVofInvestigationClassificationPolicy(customProfile('FUTURE'))).toBeUndefined();
  });

  it('fails closed when a fixed owner schema is missing or ambiguous', () => {
    const missing = createSupportInvestigationProfile({
      application: 'IAF',
      documents: [{ key: 'manager', schemaName: 'utredning-enhetschef', tabLabel: 'Manager', ownerLabel: 'Manager' }],
    });
    const ambiguous = createSupportInvestigationProfile({
      application: 'IAF',
      documents: [...customProfile().documents, { key: 'manager-copy', schemaName: 'utredning-enhetschef', tabLabel: 'Copy', ownerLabel: 'Manager' }],
    });
    expect(resolveIafVofInvestigationClassificationPolicy(missing)).toBeUndefined();
    expect(resolveIafVofInvestigationClassificationPolicy(ambiguous)).toBeUndefined();
  });

  it('selects manager for deviations and SoL/LSS for reported misconduct', () => {
    const policy = resolveIafVofInvestigationClassificationPolicy(customProfile());
    if (!policy) throw new Error('Expected IAF policy');

    expect(resolveIafVofInvestigationClassificationOwner(policy, { parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }] })).toEqual({
      mode: 'default',
      documentKey: 'manager-document',
    });
    expect(resolveIafVofInvestigationClassificationOwner(policy, { parameters: [{ key: 'eventType', values: [' missforhallande '] }] })).toEqual({
      mode: 'reported-misconduct',
      documentKey: 'social-document',
    });
  });

  it('uses resourcePath as authoritative and resourceName only as a pathless fallback', () => {
    const policy = resolveIafVofInvestigationClassificationPolicy(getSupportInvestigationProfile('IAF'))!;
    expect(resolveIafVofInvestigationClassificationOwner(policy, { labels: [{ resourcePath: 'OTHER/ABUSE', resourceName: 'ABUSE' }] }).mode).toBe(
      'default',
    );
    expect(resolveIafVofInvestigationClassificationOwner(policy, { labels: [{ resourceName: 'ABUSE' }] }).mode).toBe('reported-misconduct');
  });

  it('resolves at most one decision applicability per errand, reported misconduct first', () => {
    const hslLabel = { classification: 'PROVISION', resourcePath: 'PROVISION/HSL', resourceName: 'HSL' };
    const solLabel = { classification: 'PROVISION', resourcePath: 'PROVISION/SOL', resourceName: 'SOL' };
    const deviation = { parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }] };
    const misconduct = { parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE'] }] };

    expect(resolveIafVofInvestigationDocumentApplicability({ ...deviation, labels: [solLabel] })).toBeUndefined();
    expect(resolveIafVofInvestigationDocumentApplicability({ ...deviation, labels: [hslLabel] })).toBe('hsl-deviation');
    expect(resolveIafVofInvestigationDocumentApplicability({ ...deviation, labels: [solLabel, hslLabel] })).toBe('hsl-deviation');
    expect(resolveIafVofInvestigationDocumentApplicability({ ...misconduct, labels: [solLabel] })).toBe('reported-misconduct');
    expect(resolveIafVofInvestigationDocumentApplicability({ ...misconduct, labels: [hslLabel, solLabel] })).toBe('reported-misconduct');
  });

  it('recognises the HSL legal base by path, and by name only for a pathless legal base label', () => {
    expect(resolveIafVofInvestigationDocumentApplicability({ labels: [{ classification: 'PROVISION', resourcePath: '/provision/hsl/' }] })).toBe(
      'hsl-deviation',
    );
    expect(resolveIafVofInvestigationDocumentApplicability({ labels: [{ classification: 'provision', resourceName: ' hsl ' }] })).toBe(
      'hsl-deviation',
    );
    // The category branch for HSL is also named HSL; it is not a legal base.
    expect(
      resolveIafVofInvestigationDocumentApplicability({
        labels: [{ classification: 'CATEGORY', resourcePath: 'CATEGORY/HSL', resourceName: 'HSL' }],
      }),
    ).toBeUndefined();
    expect(resolveIafVofInvestigationDocumentApplicability({ labels: [{ classification: 'CATEGORY', resourceName: 'HSL' }] })).toBeUndefined();
    expect(
      resolveIafVofInvestigationDocumentApplicability({ labels: [{ classification: 'PROVISION', resourcePath: 'OTHER/PROVISION/HSL' }] }),
    ).toBeUndefined();
  });

  it('protects only the fixed eventType selector from generic parameter writes', () => {
    const current = [{ key: 'eventType', values: ['AVVIKELSE'] }];
    expect(preservesIafVofInvestigationClassificationOwnerParameter(current, current)).toBe(true);
    expect(preservesIafVofInvestigationClassificationOwnerParameter(current, [{ key: 'eventType', values: ['MISSFORHALLANDE'] }])).toBe(false);
    expect(
      preservesIafVofInvestigationClassificationOwnerParameter(
        [...current, { key: 'facility', values: ['OLD'] }],
        [...current, { key: 'facility', values: ['NEW'] }],
      ),
    ).toBe(true);
  });
});
