import type { User } from '@common/interfaces/user';
import { apiService } from '@common/services/api-service';
import type { ForwardFormProps } from '@supportmanagement/components/support-errand/sidebar/buttons/support-forward-errand-button.component';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { forwardSupportErrand, SupportErrand } from './support-errand-service';

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
