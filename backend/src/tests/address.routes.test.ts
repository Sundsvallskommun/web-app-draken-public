// The person lookups through the real middleware chain (permissions, rate limit, validation,
// error handling), which calling the controller methods directly skips.

import errorMiddleware from '@middlewares/error.middleware';
import express from 'express';
import { useExpressServer } from 'routing-controllers';
import request from 'supertest';

import { AddressController } from '@/controllers/address.controller';
import { User } from '@/interfaces/users.interface';
import { logger } from '@/utils/logger';

import { mockUser } from './helpers/http';
import { mockCitizenPartyId, mockPersonNumber } from './helpers/mock-data';

const { apiGet, getPartyIdByPersonNumber } = vi.hoisted(() => ({ apiGet: vi.fn(), getPartyIdByPersonNumber: vi.fn() }));

vi.mock('@/services/api.service', () => ({
  default: class {
    get = apiGet;
  },
}));
vi.mock('@/services/citizen.service', () => ({
  CitizenService: class {
    getPartyIdByPersonNumber = getPartyIdByPersonNumber;
  },
}));

const caseWorker = (username: string, permissions: Partial<User['permissions']> = { canEditSupportManagement: true }) =>
  mockUser({ username, permissions: permissions as User['permissions'] });

const buildApp = (user: User) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    Object.assign(req, { user, isAuthenticated: () => true });
    next();
  });
  useExpressServer(app, { controllers: [AddressController], defaultErrorHandler: false });
  app.use(errorMiddleware);
  return app;
};

const citizen = (overrides: Record<string, unknown> = {}) => ({
  personId: mockCitizenPartyId,
  givenname: 'Kim',
  lastname: 'Svensson',
  classified: 'N',
  protectedNR: 'N',
  addresses: [{ address: 'NORRMALMSGATAN 4', postalCode: '851 85', city: 'SUNDSVALL' }],
  ...overrides,
});

const routes = ['/address', '/employed/loginname'];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  getPartyIdByPersonNumber.mockResolvedValue(mockCitizenPartyId);
  apiGet.mockResolvedValue({ data: citizen() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(routes)('POST %s', route => {
  it('refuses a user without permission to handle errands', async () => {
    const response = await request(buildApp(caseWorker(`no-role${route}`, {})))
      .post(route)
      .send({ ssn: mockPersonNumber });

    expect(response.status).toBe(403);
    expect(getPartyIdByPersonNumber).not.toHaveBeenCalled();
  });

  it('answers 404 for a personal number nobody has', async () => {
    getPartyIdByPersonNumber.mockResolvedValue('');

    const response = await request(buildApp(caseWorker(`unknown${route}`)))
      .post(route)
      .send({ ssn: mockPersonNumber });

    expect(response.status).toBe(404);
  });

  it('stops a case worker after 30 lookups a minute', async () => {
    const warn = vi.spyOn(logger, 'warn');
    const app = buildApp(caseWorker(`busy${route}`));
    for (let i = 0; i < 30; i++) {
      expect((await request(app).post(route).send({ ssn: mockPersonNumber })).status).toBe(200);
    }

    const response = await request(app).post(route).send({ ssn: mockPersonNumber });

    expect(response.status).toBe(429);
    expect(warn).toHaveBeenCalledWith(`AUDIT person lookup rate limited: user=busy${route}`);
  });

  it('records the lookup by party id, never by personal number', async () => {
    const info = vi.spyOn(logger, 'info');

    await request(buildApp(caseWorker(`audited${route}`)))
      .post(route)
      .send({ ssn: mockPersonNumber });

    const audit = info.mock.calls.map(([line]) => String(line)).filter(line => line.startsWith('AUDIT'));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toContain(`user=audited${route} outcome=found partyId=${mockCitizenPartyId}`);
    expect(audit[0]).not.toContain(mockPersonNumber);
  });
});

describe('POST /address and protected personal data', () => {
  it('sends the address of a person without protected personal data', async () => {
    const response = await request(buildApp(caseWorker('open-address')))
      .post('/address')
      .send({ ssn: mockPersonNumber });

    expect(response.body.data).toMatchObject({ protectedIdentity: false, addresses: citizen().addresses });
  });

  it('keeps a protected address in the BFF', async () => {
    apiGet.mockResolvedValue({ data: citizen({ classified: 'J', protectedNR: 'J' }) });

    const response = await request(buildApp(caseWorker('protected-address')))
      .post('/address')
      .send({ ssn: mockPersonNumber });

    expect(response.body.data).toMatchObject({ protectedIdentity: true, addresses: [], givenname: 'Kim' });
    expect(JSON.stringify(response.body)).not.toContain('NORRMALMSGATAN');
  });
});
