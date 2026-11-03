import { apiServiceName } from '@/config/api-config';
import { AddressController } from '@/controllers/address.controller';
import { logger } from '@/utils/logger';

import { mockReq, mockRes } from './helpers/http';
import { mockAdUsername, mockCitizenPartyId, mockPersonNumber } from './helpers/mock-data';

const CITIZEN_SERVICE = apiServiceName('citizen');

const makeController = () => {
  const controller = new AddressController();
  const api = { get: vi.fn(async (_config: { url: string }, _user: unknown) => ({ data: { personId: mockCitizenPartyId }, message: 'success' })) };
  const citizen = { getPartyIdByPersonNumber: vi.fn(async () => mockCitizenPartyId) };
  (controller as unknown as { apiService: typeof api }).apiService = api;
  (controller as unknown as { citizenService: typeof citizen }).citizenService = citizen;
  return { controller, api, citizen };
};

describe('AddressController person lookup', () => {
  let info: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    info = vi.spyOn(logger, 'info');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const auditLines = () => info.mock.calls.map(([line]: unknown[]) => String(line)).filter((line: string) => line.startsWith('AUDIT'));

  it('looks the person up by party id and records who did it', async () => {
    const { controller, api, citizen } = makeController();

    const result = await controller.cases(mockReq(), mockRes(), { ssn: mockPersonNumber });

    expect(result.data).toEqual({ personId: mockCitizenPartyId, protectedIdentity: false });
    expect(citizen.getPartyIdByPersonNumber).toHaveBeenCalledWith(expect.any(String), mockPersonNumber, expect.anything());
    expect(api.get).toHaveBeenCalledWith({ url: expect.stringContaining(`${CITIZEN_SERVICE}/`) }, expect.anything());
    expect(api.get.mock.calls[0][0].url).not.toContain(mockPersonNumber);
    expect(auditLines()).toEqual([`AUDIT person lookup: user=${mockAdUsername} outcome=found partyId=${mockCitizenPartyId}`]);
  });

  it('answers 404 and records the lookup when nobody has the personal number', async () => {
    const { controller, citizen } = makeController();
    citizen.getPartyIdByPersonNumber.mockResolvedValue('');

    await expect(controller.cases(mockReq(), mockRes(), { ssn: mockPersonNumber })).rejects.toMatchObject({ status: 404 });
    expect(auditLines()).toEqual([`AUDIT person lookup: user=${mockAdUsername} outcome=not found`]);
  });

  it('records a failed lookup without the personal number', async () => {
    const { controller, api } = makeController();
    api.get.mockRejectedValue(new Error('citizen down'));

    await expect(controller.cases(mockReq(), mockRes(), { ssn: mockPersonNumber })).rejects.toThrow('citizen down');
    expect(auditLines()).toEqual([`AUDIT person lookup: user=${mockAdUsername} outcome=failed partyId=${mockCitizenPartyId}`]);
    expect(auditLines().join()).not.toContain(mockPersonNumber);
  });
});
