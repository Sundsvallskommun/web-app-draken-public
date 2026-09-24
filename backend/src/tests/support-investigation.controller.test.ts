import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  CreateSupportInvestigationDto,
  SupportInvestigationController,
  UpdateSupportInvestigationSectionDto,
} from '@/controllers/supportmanagement/support-investigation.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockAdUsername, mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const MUNICIPALITY_ID = mockMunicipalityId;
const INVESTIGATION_ID = 'investigation-1';
const SECTION_ID = 'section-1';
const investigationsUrl = `${MUNICIPALITY_ID}/${mockSupportNamespace}/errands/${mockSupportErrandId}/investigations`;

const sections = [
  { sectionKey: 'suitability', heading: 'Lämplighet (vandel)', sortOrder: 1 },
  { sectionKey: 'knowledge_test', heading: 'Kunskapsprov', sortOrder: 2 },
];

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

const makeController = (existing: object[] = []) => {
  const controller = new SupportInvestigationController();
  const api: ApiStub = {
    get: vi.fn(async (config: { url?: string }) =>
      config.url === investigationsUrl
        ? { data: existing, message: 'success' }
        : { data: { id: INVESTIGATION_ID, version: 4, status: 'ACTIVE', sections: [] }, message: 'success' },
    ),
    post: vi.fn(async () => ({ data: { id: INVESTIGATION_ID }, message: 'success' })),
    patch: vi.fn(async () => ({ data: {}, message: 'success' })),
  };
  Object.assign(controller as object, { apiService: api });
  return { controller, api };
};

describe('the investigation payloads', () => {
  it('requires a section to carry its key, heading and order', async () => {
    const valid = plainToInstance(CreateSupportInvestigationDto, { title: 'Utredning', sections });
    const invalid = plainToInstance(CreateSupportInvestigationDto, { sections: [{ sectionKey: 'suitability' }] });

    await expect(validate(valid)).resolves.toEqual([]);
    expect(JSON.stringify(await validate(invalid))).toMatch(/heading|sortOrder/);
  });

  it('refuses an assessment the service does not know', async () => {
    const valid = plainToInstance(UpdateSupportInvestigationSectionDto, { assessment: 'DEFICIENCY' });
    const invalid = plainToInstance(UpdateSupportInvestigationSectionDto, { assessment: 'BRIST' });

    await expect(validate(valid)).resolves.toEqual([]);
    expect(JSON.stringify(await validate(invalid))).toMatch(/assessment/);
  });
});

describe('createInvestigation', () => {
  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.createInvestigation(mockReq(), mockSupportErrandId, '9999', { sections }, res);

    expect(res.statusCode).toBe(400);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('starts the investigation as active, by the handler, and writes a section per examination', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.createInvestigation(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { title: 'Utredning', sections }, res);

    expect(res.statusCode).toBe(201);
    const [createConfig] = api.post.mock.calls[0];
    expect(createConfig.url).toBe(investigationsUrl);
    expect(createConfig.data).toMatchObject({ status: 'ACTIVE', title: 'Utredning', investigatorUserId: mockAdUsername });
    expect(createConfig.data.startedAt).toEqual(expect.any(String));

    expect(api.post).toHaveBeenCalledTimes(3);
    expect(api.post.mock.calls[1][0]).toMatchObject({
      url: `${investigationsUrl}/${INVESTIGATION_ID}/sections`,
      data: { sectionKey: 'suitability', heading: 'Lämplighet (vandel)', sortOrder: 1, assessment: 'PENDING' },
    });
    expect(api.post.mock.calls[2][0].data).toMatchObject({ sectionKey: 'knowledge_test', assessment: 'PENDING' });
  });

  it('answers with the investigation the errand already has, and writes no second one', async () => {
    const { controller, api } = makeController([{ id: INVESTIGATION_ID, status: 'ACTIVE' }]);
    const res = mockRes();

    await controller.createInvestigation(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { sections }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: INVESTIGATION_ID });
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('updateInvestigation', () => {
  it('carries the version the handler read as If-Match, and never writes it as a field', async () => {
    const { controller, api } = makeController();

    await controller.updateInvestigation(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      INVESTIGATION_ID,
      { version: 4, summary: 'Prövningarna är klara', recommendation: 'APPROVAL' },
      mockRes(),
    );

    const [config] = api.patch.mock.calls[0];
    expect(config.url).toBe(`${investigationsUrl}/${INVESTIGATION_ID}`);
    expect(config.headers).toEqual({ 'If-Match': '"4"' });
    expect(config.data).toEqual({ summary: 'Prövningarna är klara', recommendation: 'APPROVAL' });
  });
});

describe('completeInvestigation', () => {
  it('concludes the investigation and stamps the time the service leaves to the caller', async () => {
    const { controller, api } = makeController();

    await controller.completeInvestigation(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      INVESTIGATION_ID,
      { version: 6, recommendation: 'REJECTION' },
      mockRes(),
    );

    const [config] = api.patch.mock.calls[0];
    expect(config.headers).toEqual({ 'If-Match': '"6"' });
    expect(config.data).toMatchObject({ status: 'COMPLETED', recommendation: 'REJECTION' });
    expect(config.data.completedAt).toEqual(expect.any(String));
  });
});

describe('updateSection', () => {
  it('records who assessed an examination, and when', async () => {
    const { controller, api } = makeController();

    await controller.updateSection(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      INVESTIGATION_ID,
      SECTION_ID,
      { text: 'Ingen anmärkning', assessment: 'APPROVED' },
      mockRes(),
    );

    const [config] = api.patch.mock.calls[0];
    expect(config.url).toBe(`${investigationsUrl}/${INVESTIGATION_ID}/sections/${SECTION_ID}`);
    expect(config.data).toMatchObject({ text: 'Ingen anmärkning', assessment: 'APPROVED', completedBy: mockAdUsername });
    expect(config.data.completedAt).toEqual(expect.any(String));
  });

  it('leaves an examination that has not been assessed without an assessor', async () => {
    const { controller, api } = makeController();

    await controller.updateSection(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      INVESTIGATION_ID,
      SECTION_ID,
      { text: 'Påbörjad', assessment: 'PENDING' },
      mockRes(),
    );

    const [config] = api.patch.mock.calls[0];
    expect(config.data).toEqual({ text: 'Påbörjad', assessment: 'PENDING' });
  });

  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.updateSection(mockReq(), mockSupportErrandId, '9999', INVESTIGATION_ID, SECTION_ID, { text: 'x' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.patch).not.toHaveBeenCalled();
  });
});
