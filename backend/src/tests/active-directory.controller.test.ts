import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { ActiveDirectoryController, AdUser } from '@/controllers/active-directory.controller';
import ApiService from '@/services/api.service';

import { mockReq } from './helpers/http';

const manager: AdUser = { name: 'manager', displayName: 'Manager Test', guid: 'manager-id' };
const investigator: AdUser = { name: 'investigator', displayName: 'Investigator Test', guid: 'investigator-id' };
const groupUrl = (group: string) => `${apiServiceName('activedirectory')}/${MUNICIPALITY_ID}/groupmembers/personal/${encodeURIComponent(group)}`;

beforeEach(() => {
  vi.stubEnv('DOMAIN', 'personal');
  vi.stubEnv('ADMIN_GROUP', 'admins');
  vi.stubEnv('ASSIGNABLE_HANDLER_GROUPS', undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('ActiveDirectoryController assignable handlers', () => {
  it('preserves the existing response and admin group default', async () => {
    const get = vi.spyOn(ApiService.prototype, 'get').mockResolvedValue({
      data: [{ ...manager, personId: 'excluded', description: 'excluded' }],
      message: 'ok',
    });
    const req = mockReq();

    await expect(new ActiveDirectoryController().getAssignableHandlers(req)).resolves.toEqual({ data: [manager], message: 'ok' });
    expect(get).toHaveBeenCalledExactlyOnceWith({ url: groupUrl('admins') }, req.user);
  });

  it('combines configured groups without showing a shared AD account twice', async () => {
    vi.stubEnv('ASSIGNABLE_HANDLER_GROUPS', 'managers, investigators, MANAGERS');
    const get = vi.spyOn(ApiService.prototype, 'get').mockImplementation(async ({ url }) => {
      if (url === groupUrl('managers')) return { data: [manager], message: 'ok' };
      if (url === groupUrl('investigators')) return { data: [{ ...manager, name: 'MANAGER' }, investigator], message: 'ok' };
      throw new Error(`Unexpected directory group URL: ${url}`);
    });

    await expect(new ActiveDirectoryController().getAssignableHandlers(mockReq())).resolves.toEqual({
      data: [manager, investigator],
      message: 'ok',
    });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('encodes group names as individual URL path segments', async () => {
    vi.stubEnv('ASSIGNABLE_HANDLER_GROUPS', 'MAS/MAR Test');
    const get = vi.spyOn(ApiService.prototype, 'get').mockResolvedValue({ data: [investigator], message: 'ok' });

    await expect(new ActiveDirectoryController().getAssignableHandlers(mockReq())).resolves.toEqual({ data: [investigator], message: 'ok' });
    expect(get).toHaveBeenCalledWith({ url: groupUrl('MAS/MAR Test') }, expect.anything());
  });

  it('keeps a complete list for one hour and then refreshes membership', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.spyOn(ApiService.prototype, 'get')
      .mockResolvedValueOnce({ data: [manager], message: 'ok' })
      .mockResolvedValueOnce({ data: [investigator], message: 'ok' });
    const controller = new ActiveDirectoryController();

    await expect(controller.getAssignableHandlers(mockReq())).resolves.toEqual({ data: [manager], message: 'ok' });
    vi.advanceTimersByTime(60 * 60 * 1000 - 1);
    await expect(controller.getAssignableHandlers(mockReq())).resolves.toEqual({ data: [manager], message: 'ok' });
    vi.advanceTimersByTime(1);
    await expect(controller.getAssignableHandlers(mockReq())).resolves.toEqual({ data: [investigator], message: 'ok' });
  });

  it('caches an empty directory result too', async () => {
    const get = vi.spyOn(ApiService.prototype, 'get').mockResolvedValue({ data: [], message: 'ok' });
    const controller = new ActiveDirectoryController();

    await expect(controller.getAssignableHandlers(mockReq())).resolves.toEqual({ data: [], message: 'ok' });
    await expect(controller.getAssignableHandlers(mockReq())).resolves.toEqual({ data: [], message: 'ok' });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('fails the complete lookup when one group fails and retries without caching a partial list', async () => {
    vi.stubEnv('ASSIGNABLE_HANDLER_GROUPS', 'managers, investigators');
    const failure = new Error('Directory unavailable');
    vi.spyOn(ApiService.prototype, 'get')
      .mockResolvedValueOnce({ data: [manager], message: 'ok' })
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ data: [], message: 'ok' })
      .mockResolvedValueOnce({ data: [investigator], message: 'ok' });
    const controller = new ActiveDirectoryController();

    await expect(controller.getAssignableHandlers(mockReq())).rejects.toBe(failure);
    await expect(controller.getAssignableHandlers(mockReq())).resolves.toEqual({ data: [investigator], message: 'ok' });
  });

  it('does not share a cached directory between differently configured controller instances', async () => {
    vi.spyOn(ApiService.prototype, 'get')
      .mockResolvedValueOnce({ data: [manager], message: 'ok' })
      .mockResolvedValueOnce({ data: [investigator], message: 'ok' });

    await expect(new ActiveDirectoryController().getAssignableHandlers(mockReq())).resolves.toEqual({ data: [manager], message: 'ok' });
    vi.stubEnv('ASSIGNABLE_HANDLER_GROUPS', 'investigators');
    await expect(new ActiveDirectoryController().getAssignableHandlers(mockReq())).resolves.toEqual({ data: [investigator], message: 'ok' });
  });
});
