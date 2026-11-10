import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import type { User } from '@common/interfaces/user';
import { apiService } from '@common/services/api-service';
import { appConfig } from '@config/appconfig';
import type { ForwardFormProps } from '@supportmanagement/components/support-errand/sidebar/buttons/support-forward-errand-button.component';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  ApiSupportErrand,
  ExternalIdType,
  forwardSupportErrand,
  getLabelCategorizationHeading,
  getStakeholderOrganizationNumber,
  mapApiSupportErrandToSupportErrand,
  SupportErrand,
  supportErrandHasAnIdentifiedApplicant,
  supportErrandIsEmpty,
  supportErrandRejectionReason,
  updateSupportErrand,
} from './support-errand-service';

vi.mock('@common/components/file-upload/file-upload.component', () => ({
  imageMimeTypes: [],
  documentMimeTypes: [],
}));
vi.mock('@common/services/api-service', () => ({ apiService: { post: vi.fn(), patch: vi.fn() } }));
vi.mock('@config/appconfig', () => ({ appConfig: { features: {} } }));
vi.mock('@sk-web-gui/react', () => ({ useSnackbar: vi.fn() }));
vi.mock('@stores/index', () => ({ useConfigStore: vi.fn(), useSupportStore: vi.fn() }));
vi.mock('@stores/ui-settings-store', () => ({ useUiSettingsStore: vi.fn() }));
vi.mock('./support-message-service', () => ({ sendMessage: vi.fn() }));
vi.mock('./support-attachment-service', () => ({ saveSupportAttachments: vi.fn() }));

const user = { username: 'handler', name: 'Test Handler' } as User;
const supportErrand = {
  id: 'errand-1',
  errandNumber: 'KC-1',
  assignedUserId: 'handler',
  stakeholders: [],
} as unknown as SupportErrand;

const forwardForm = (overrides: Partial<ForwardFormProps>): ForwardFormProps => ({
  recipient: 'DEPARTMENT',
  emails: [],
  department: '',
  message: '',
  messageBodyPlaintext: '',
  ...overrides,
});

beforeEach(() => {
  vi.mocked(apiService.post)
    .mockReset()
    .mockResolvedValue({ data: {} } as never);
  vi.mocked(apiService.patch)
    .mockReset()
    .mockResolvedValue({ data: {} } as never);
});

describe('forwardSupportErrand', () => {
  test.each(['SBK_MEX', 'SBK_PARKING_PERMIT'])(
    'forwards to %s without a message and closes the errand',
    async (department) => {
      await forwardSupportErrand(user, supportErrand, '2281', forwardForm({ department }), []);

      expect(apiService.post).toHaveBeenCalledWith(
        'supporterrands/2281/errand-1/forward',
        expect.objectContaining({ recipient: 'DEPARTMENT', department, message: '' })
      );
      expect(apiService.patch).toHaveBeenCalledWith('supporterrands/2281/errand-1', expect.anything());
    }
  );

  test('rejects an email forward without a message and sends nothing', async () => {
    await expect(
      forwardSupportErrand(user, supportErrand, '2281', forwardForm({ recipient: 'EMAIL' }), [])
    ).rejects.toMatch('without message');

    expect(apiService.post).not.toHaveBeenCalled();
    expect(apiService.patch).not.toHaveBeenCalled();
  });
});

const label = (classification: string, resourcePath: string, labels?: Label[]): Label => ({
  classification,
  resourcePath,
  resourceName: resourcePath,
  displayName: resourcePath,
  ...(labels && { labels }),
});
const apiErrand = (overrides: Partial<ApiSupportErrand>): ApiSupportErrand =>
  ({ id: 'errand-1', stakeholders: [], ...overrides } as ApiSupportErrand);
const patchedBody = () => vi.mocked(apiService.patch).mock.calls[0][1] as Partial<ApiSupportErrand>;

describe('with label categorization', () => {
  beforeEach(() => {
    appConfig.features.useLabelCategorization = true;
  });
  afterEach(() => {
    appConfig.features.useLabelCategorization = false;
  });

  describe('mapApiSupportErrandToSupportErrand', () => {
    test('fills category, type and subType from the labels, not the classification', () => {
      const errand = mapApiSupportErrandToSupportErrand(
        apiErrand({
          classification: { category: 'OLD', type: 'OLD.TYPE' },
          labels: [
            label('ROOT', 'ROOT'),
            label('CATEGORY', 'SALARY'),
            label('TYPE', 'SALARY/PAYSLIP'),
            label('SUBTYPE', 'SALARY/PAYSLIP/MISSING'),
          ],
        })
      );

      expect(errand).toMatchObject({ category: 'SALARY', type: 'SALARY/PAYSLIP', subType: 'SALARY/PAYSLIP/MISSING' });
    });

    test('uses the department as category when the errand has no category label', () => {
      const errand = mapApiSupportErrandToSupportErrand(apiErrand({ labels: [label('DEPARTMENT', 'KSK')] }));

      expect(errand).toMatchObject({ category: 'KSK', type: '', subType: '' });
    });

    test('leaves the fields empty for an errand without labels', () => {
      const errand = mapApiSupportErrandToSupportErrand(
        apiErrand({ classification: { category: 'BOU', type: 'OTHER' }, labels: [] })
      );

      expect(errand).toMatchObject({ category: '', type: '', subType: '' });
    });
  });

  describe('supportErrandIsEmpty', () => {
    test('counts an errand as categorized by its labels or by a classification alone', () => {
      const byLabels = mapApiSupportErrandToSupportErrand(apiErrand({ labels: [label('CATEGORY', 'SALARY')] }));
      const byClassification = mapApiSupportErrandToSupportErrand(
        apiErrand({ classification: { category: 'BOU', type: 'OTHER' } })
      );

      expect(supportErrandIsEmpty(byLabels)).toBe(false);
      expect(supportErrandIsEmpty(byClassification)).toBe(false);
    });

    test('counts an errand without labels and classification, or without id, as empty', () => {
      const neither = mapApiSupportErrandToSupportErrand(
        apiErrand({ classification: { category: 'NONE', type: 'NONE' } })
      );
      const noId = mapApiSupportErrandToSupportErrand(
        apiErrand({ id: undefined, labels: [label('CATEGORY', 'SALARY')] })
      );

      expect(supportErrandIsEmpty(neither)).toBe(true);
      expect(supportErrandIsEmpty(noId)).toBe(true);
    });
  });

  describe('updateSupportErrand', () => {
    test('sends the labels without their children and no classification', async () => {
      await updateSupportErrand('2281', {
        id: 'errand-1',
        category: 'SALARY',
        type: 'SALARY/PAYSLIP',
        labels: [label('ROOT', 'ROOT'), label('CATEGORY', 'SALARY', [label('TYPE', 'SALARY/PAYSLIP')])],
      });

      expect(apiService.patch).toHaveBeenCalledWith('supporterrands/2281/errand-1', expect.anything());
      expect(patchedBody().classification).toBeUndefined();
      expect(patchedBody().labels).toEqual([label('ROOT', 'ROOT'), label('CATEGORY', 'SALARY')]);
    });
  });
});

describe('without label categorization', () => {
  test('fills the form fields from the classification, blanking NONE, and keeps the labels on the errand', () => {
    const errand = mapApiSupportErrandToSupportErrand(
      apiErrand({ classification: { category: 'BOU', type: 'NONE' }, labels: [label('CATEGORY', 'SALARY')] })
    );

    expect(errand).toMatchObject({ category: 'BOU', type: '', subType: '', labels: [label('CATEGORY', 'SALARY')] });
  });

  test('sends the classification from category and type', async () => {
    await updateSupportErrand('2281', { id: 'errand-1', category: 'BOU', type: 'OTHER' });

    expect(patchedBody().classification).toEqual({ category: 'BOU', type: 'OTHER' });
    expect(patchedBody().labels).toEqual([]);
  });
});

describe('getStakeholderOrganizationNumber', () => {
  const partyId = '11111111-2222-4333-8444-555555555555';
  const organizationNumber = mockEnv.mockOrganizationNumber;
  const stakeholder = (overrides: Record<string, unknown>) =>
    ({ externalIdType: ExternalIdType.COMPANY, ...overrides } as never);

  test('the organizationNumber parameter wins over everything else', () => {
    const s = stakeholder({
      externalId: partyId,
      organizationNumber: mockEnv.mockOrganizationNumber,
      parameters: [{ key: 'organizationNumber', values: [organizationNumber] }],
    });
    expect(getStakeholderOrganizationNumber(s)).toBe(organizationNumber);
  });

  test('the number the backend resolved from the party id is used when the parameter is missing', () => {
    expect(getStakeholderOrganizationNumber(stakeholder({ externalId: partyId, organizationNumber }))).toBe(
      organizationNumber
    );
  });

  test.each(['5560269986', '556026-9986', '165560269986'])(
    'a legacy externalId holding the org number %s is accepted',
    (externalId) => {
      expect(getStakeholderOrganizationNumber(stakeholder({ externalId }))).toBe(externalId);
    }
  );

  test.each([ExternalIdType.COMPANY, ExternalIdType.ENTERPRISE])(
    'a party UUID in externalId is never shown as a %s org number',
    (externalIdType) => {
      expect(getStakeholderOrganizationNumber(stakeholder({ externalIdType, externalId: partyId }))).toBeUndefined();
    }
  );

  test('a person never gets an org number from externalId', () => {
    expect(
      getStakeholderOrganizationNumber(
        stakeholder({ externalIdType: ExternalIdType.PRIVATE, externalId: '5560269986' })
      )
    ).toBeUndefined();
  });
});

describe('supportErrandRejectionReason', () => {
  const rejection = (status: number, message?: string) => ({ response: { status, data: { message } } });

  test('reads what the service said when it rejected the write', () => {
    expect(supportErrandRejectionReason(rejection(400, 'Schema validation failed: missing required field'))).toBe(
      'Schema validation failed: missing required field'
    );
  });

  test('says nothing when the failure was not a rejection', () => {
    expect(supportErrandRejectionReason(rejection(500, 'Internal server error'))).toBeUndefined();
    expect(supportErrandRejectionReason(rejection(409, 'Errand is locked'))).toBeUndefined();
    expect(supportErrandRejectionReason(new Error('Network Error'))).toBeUndefined();
    expect(supportErrandRejectionReason(undefined)).toBeUndefined();
  });

  test('says nothing when the rejection carries no reason', () => {
    expect(supportErrandRejectionReason(rejection(400, 'Constraint Violation'))).toBeUndefined();
    expect(supportErrandRejectionReason(rejection(400, 'Request failed'))).toBeUndefined();
    expect(supportErrandRejectionReason(rejection(400, '   '))).toBeUndefined();
    expect(supportErrandRejectionReason(rejection(400))).toBeUndefined();
  });
});

describe('getLabelCategorizationHeading', () => {
  const label = (classification: string, resourcePath: string, displayName?: string) => ({
    classification,
    resourcePath,
    displayName,
  });

  const errand = (over: Partial<SupportErrand> = {}): SupportErrand =>
    ({ id: 'errand-id', category: '', labels: [], ...over } as SupportErrand);

  beforeEach(() => {
    appConfig.features.useLabelCategorization = true;
  });

  afterEach(() => {
    appConfig.features.useLabelCategorization = false;
  });

  test('names the deepest level of the categorization', () => {
    const labels = [
      label('CATEGORY', 'ALCOHOL', 'Alkohol'),
      label('TYPE', 'SERVING_PERMIT_APPLICATION', 'Ansökan om serveringstillstånd'),
      label('SUBTYPE', 'PERMANENT_SERVING', 'Stadigvarande servering'),
    ];

    expect(getLabelCategorizationHeading(errand({ category: 'ALCOHOL', labels }), undefined)).toBe(
      'Stadigvarande servering'
    );
  });

  test('says the errand is being registered while its shell carries no categorization', () => {
    expect(getLabelCategorizationHeading(errand(), undefined)).toBe('Registrera nytt ärende');
  });

  test('still says the type is missing on an errand that is categorized in every other way', () => {
    expect(getLabelCategorizationHeading(errand({ category: 'ALCOHOL' }), undefined)).toBe('(Ärendetyp saknas)');
  });

  test('reads the classification of an errand registered before label categorization', () => {
    const legacy = errand({ classification: { category: 'ALCOHOL', type: 'NONE' } } as Partial<SupportErrand>);

    expect(getLabelCategorizationHeading(legacy, undefined)).toBe('ALCOHOL');
  });
});

describe('supportErrandHasAnIdentifiedApplicant', () => {
  const PARTY_ID = 'a3f1c2e4-0000-4000-8000-000000000001';

  const errandWith = (customer: unknown[]) => ({ customer } as unknown as SupportErrand);

  test('an applicant the register knows counts', () => {
    expect(supportErrandHasAnIdentifiedApplicant(errandWith([{ role: 'PRIMARY', externalId: PARTY_ID }]))).toBe(true);
  });

  test('an applicant without a party id does not', () => {
    expect(supportErrandHasAnIdentifiedApplicant(errandWith([{ role: 'PRIMARY' }]))).toBe(false);
    expect(supportErrandHasAnIdentifiedApplicant(errandWith([{ role: 'PRIMARY', externalId: '   ' }]))).toBe(false);
  });

  test('an errand without an applicant does not', () => {
    expect(supportErrandHasAnIdentifiedApplicant(errandWith([]))).toBe(false);
    expect(supportErrandHasAnIdentifiedApplicant(undefined)).toBe(false);
  });

  test('one identified applicant among several is enough', () => {
    const customer = [{ role: 'PRIMARY' }, { role: 'PRIMARY', externalId: PARTY_ID }];

    expect(supportErrandHasAnIdentifiedApplicant(errandWith(customer))).toBe(true);
  });
});
