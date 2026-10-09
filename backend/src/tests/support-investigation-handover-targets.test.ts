import { resolveSupportInvestigationHandoverTargets } from '@/config/support-investigation-handover-targets';
import { SupportInvestigationHandoverTargetService } from '@/services/support-investigation-handover-target.service';

const configuredTarget = JSON.stringify([{ municipalityId: '2281', namespace: 'FUTURE_TARGET', documentKeys: ['future-investigation'] }]);

describe('support investigation handover target configuration', () => {
  it('normalizes and freezes a strict deployment allowlist', () => {
    const targets = resolveSupportInvestigationHandoverTargets(
      JSON.stringify([{ municipalityId: ' 2281 ', namespace: ' FUTURE_TARGET ', documentKeys: ['future-investigation'] }]),
    );

    expect(targets).toEqual([{ municipalityId: '2281', namespace: 'FUTURE_TARGET', documentKeys: ['future-investigation'] }]);
    expect(Object.isFrozen(targets)).toBe(true);
    expect(Object.isFrozen(targets?.[0])).toBe(true);
  });

  it.each([
    ['not-json', 'must contain valid JSON'],
    ['{}', 'must be an array'],
    ['[null]', '[0] must be an object'],
    ['[{"municipalityId":"2281"}]', '[0].namespace must be a non-empty string'],
    ['[{"municipalityId":"2281","namespace":"target","documentKeys":["future-investigation"],"typo":true}]', '[0] contains unknown keys: typo'],
    ['[{"municipalityId":"2281","namespace":"bad target","documentKeys":["future-investigation"]}]', '[0].namespace may only contain'],
    ['[{"municipalityId":"2281","namespace":"target"}]', '[0].documentKeys must be a non-empty array'],
    ['[{"municipalityId":"2281","namespace":"target","documentKeys":["Future_Investigation"]}]', 'must be a lowercase kebab-case identifier'],
    [
      '[{"municipalityId":"2281","namespace":"target","documentKeys":["future-investigation","future-investigation"]}]',
      'contains duplicate document key',
    ],
    [
      '[{"municipalityId":"2281","namespace":"TARGET","documentKeys":["future-investigation"]},{"municipalityId":"2281","namespace":"target","documentKeys":["future-investigation"]}]',
      '[1] duplicates an earlier target',
    ],
  ])('rejects invalid configuration %s', (configured, message) => {
    expect(() => resolveSupportInvestigationHandoverTargets(configured)).toThrow(message);
  });

  it('keeps missing configuration distinct from an explicit empty allowlist', () => {
    expect(resolveSupportInvestigationHandoverTargets('')).toBeUndefined();
    expect(resolveSupportInvestigationHandoverTargets('[]')).toEqual([]);
  });
});

describe('SupportInvestigationHandoverTargetService', () => {
  it('allows an explicitly configured future target and matches namespace case-insensitively', () => {
    const service = new SupportInvestigationHandoverTargetService(configuredTarget);

    expect(() => service.assertCanReceiveProtectedDocuments('2281', { namespace: 'future_target' }, ['future-investigation'])).not.toThrow();
  });

  it('uses the source municipality when the execute request omits the target municipality', () => {
    const service = new SupportInvestigationHandoverTargetService(configuredTarget);

    expect(() => service.assertCanReceiveProtectedDocuments('2281', { namespace: 'FUTURE_TARGET' }, ['future-investigation'])).not.toThrow();
  });

  it('fails unavailable when no deployment policy is configured', () => {
    const service = new SupportInvestigationHandoverTargetService('');

    expect(() => service.assertCanReceiveProtectedDocuments('2281', { namespace: 'FUTURE_TARGET' }, ['future-investigation'])).toThrow(
      expect.objectContaining({ status: 503, message: 'Investigation handover target policy is unavailable' }),
    );
  });

  it('denies targets outside an explicit allowlist', () => {
    const service = new SupportInvestigationHandoverTargetService(configuredTarget);

    expect(() => service.assertCanReceiveProtectedDocuments('2281', { namespace: 'OTHER' }, ['future-investigation'])).toThrow(
      expect.objectContaining({ status: 409, message: 'Target namespace is not configured to receive protected investigation documents' }),
    );
  });

  it('rejects non-canonical request values instead of validating one target and forwarding another', () => {
    const service = new SupportInvestigationHandoverTargetService(configuredTarget);

    expect(() => service.assertCanReceiveProtectedDocuments('2281', { namespace: ' FUTURE_TARGET ' }, ['future-investigation'])).toThrow(
      expect.objectContaining({ status: 400, message: 'Investigation handover target must use canonical identifiers' }),
    );
  });

  it('fails closed when the source profile adds a document the target has not declared', () => {
    const service = new SupportInvestigationHandoverTargetService(configuredTarget);

    expect(() =>
      service.assertCanReceiveProtectedDocuments('2281', { namespace: 'FUTURE_TARGET' }, ['future-investigation', 'future-specialist-investigation']),
    ).toThrow(
      expect.objectContaining({
        status: 409,
        message: 'Target namespace is not configured to receive investigation document future-specialist-investigation',
      }),
    );
  });
});
