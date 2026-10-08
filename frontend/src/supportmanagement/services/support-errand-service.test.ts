import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import type { User } from '@common/interfaces/user';
import { apiService } from '@common/services/api-service';
import { appConfig } from '@config/appconfig';
import type { ForwardFormProps } from '@supportmanagement/components/support-errand/sidebar/buttons/support-forward-errand-button.component';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  ApiSupportErrand,
  forwardSupportErrand,
  mapApiSupportErrandToSupportErrand,
  SupportErrand,
  supportErrandIsEmpty,
  updateSupportErrand,
} from './support-errand-service';

vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
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

// What the errand looks like when it is read back after the forward, just before it is closed.
const errandAfterForward = { status: 'ONGOING', version: 4 };

beforeEach(() => {
  vi.mocked(apiService.get)
    .mockReset()
    .mockResolvedValue({ data: errandAfterForward } as never);
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
      // Closed through the status command, conditioned on the version the forward left behind.
      expect(apiService.patch).toHaveBeenCalledWith(
        'supporterrands/2281/errand-1/status',
        expect.objectContaining({
          status: 'SOLVED',
          expectedStatus: errandAfterForward.status,
          expectedVersion: errandAfterForward.version,
        })
      );
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
// The version of the errand the form was loaded from; every errand write is conditioned on it.
const loadedErrandVersion = 3;
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
      await updateSupportErrand(
        '2281',
        {
          id: 'errand-1',
          category: 'SALARY',
          type: 'SALARY/PAYSLIP',
          labels: [label('ROOT', 'ROOT'), label('CATEGORY', 'SALARY', [label('TYPE', 'SALARY/PAYSLIP')])],
        },
        loadedErrandVersion
      );

      expect(apiService.patch).toHaveBeenCalledWith(
        'supporterrands/2281/errand-1',
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining({ 'If-Match': expect.any(String) }) })
      );
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
    await updateSupportErrand('2281', { id: 'errand-1', category: 'BOU', type: 'OTHER' }, loadedErrandVersion);

    expect(patchedBody().classification).toEqual({ category: 'BOU', type: 'OTHER' });
    expect(patchedBody().labels).toEqual([]);
  });
});
