import { SupportMeasureController } from '@/controllers/supportmanagement/support-measure.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockAdUsername, mockMunicipalityId } from './helpers/mock-data';

const errandId = '88833b47-c68b-4798-93ba-b491961c2cd5';
const measureId = '8ed7729b-9fa7-49f1-80ea-4fd54997844f';
const attachmentId = 'f1a0b2c3-4d5e-6f70-8192-a3b4c5d6e7f8';

const file = () => ({ buffer: Buffer.from('\xff\xd8'), originalname: 'foto.jpg' }) as Express.Multer.File;

const makeController = () => {
  const controller = new SupportMeasureController();
  const api = {
    get: vi.fn(async (_config: { url?: string }) => ({ data: [{ id: measureId, title: 'Ålderskontroll' }] })),
    post: vi.fn(async (config: { data?: { type: string; title: string } }) => ({
      data: { id: measureId, ...config.data },
      location: undefined as string | undefined,
    })),
    patch: vi.fn(async (config: { data?: { title: string } }) => ({ data: { id: measureId, ...config.data } })),
    delete: vi.fn(async (_config: { url?: string }) => ({ data: undefined })),
  };
  Object.assign(controller as object, { apiService: api });
  return { controller, api };
};

describe('measures of a support errand', () => {
  it('lists the measures the service holds for the errand', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.fetchMeasures(mockReq(), errandId, mockMunicipalityId, res);

    expect(api.get.mock.calls[0][0]).toMatchObject({ url: expect.stringContaining(`errands/${errandId}/measures`) });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: measureId, title: 'Ålderskontroll' }]);
  });

  it('creates a measure of the given type, titled with the text and added by the signed-in user as PRIMARY', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.createMeasure(mockReq(), errandId, mockMunicipalityId, { type: 'EXTERNAL_INSPECTION', title: 'Serveringstider följs' }, res);

    expect(api.post.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining(`errands/${errandId}/measures`),
      data: { type: 'EXTERNAL_INSPECTION', title: 'Serveringstider följs', addedByUser: mockAdUsername, addedByRole: 'PRIMARY' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ id: measureId, title: 'Serveringstider följs' });
  });

  it('creates a measure with the result and note the protocol already holds for it', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.createMeasure(
      mockReq(),
      errandId,
      mockMunicipalityId,
      { type: 'INTERNAL', title: 'Belastningsregistret', result: 'COMPLETED', description: 'Inget att anmärka på' },
      res,
    );

    expect(api.post.mock.calls[0][0].data).toMatchObject({ title: 'Belastningsregistret', result: 'COMPLETED', description: 'Inget att anmärka på' });
    expect(res.statusCode).toBe(201);
  });

  it('updates only the title of a measure', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.updateMeasure(mockReq(), errandId, mockMunicipalityId, measureId, { title: 'Ålderskontroll (18 år)' }, res);

    expect(api.patch.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining(`errands/${errandId}/measures/${measureId}`),
      data: { title: 'Ålderskontroll (18 år)' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('deletes a measure and answers 204', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.deleteMeasure(mockReq(), errandId, mockMunicipalityId, measureId, res);

    expect(api.delete.mock.calls[0][0]).toMatchObject({ url: expect.stringContaining(`measures/${measureId}`) });
    expect(res.statusCode).toBe(204);
  });

  it('refuses a municipality other than its own', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.createMeasure(mockReq(), errandId, '1984', { type: 'EXTERNAL_INSPECTION', title: 'x' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('the inspection protocol on a measure', () => {
  it('forwards only the fields that came in, so the title is left alone', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.updateMeasure(mockReq(), errandId, mockMunicipalityId, measureId, { result: null, description: 'Ingen anmärkning' }, res);

    expect(api.patch.mock.calls[0][0]).toMatchObject({ data: { result: null, description: 'Ingen anmärkning' } });
    expect((api.patch.mock.calls[0][0] as { data: object }).data).not.toHaveProperty('title');
  });

  it('uploads the file as the attachment part and answers with the measure read back', async () => {
    const { controller, api } = makeController();
    api.post.mockResolvedValueOnce({ data: undefined, location: `/attachments/${attachmentId}` } as never);
    api.get.mockResolvedValueOnce({ data: { id: measureId, title: 'Ålderskontroll', attachments: [{ id: attachmentId }] } } as never);
    const res = mockRes();

    await controller.uploadMeasureAttachment(mockReq(), [file()], errandId, mockMunicipalityId, measureId, res);

    const sent = api.post.mock.calls[0][0] as { url?: string; headers?: Record<string, string>; data?: { getBuffer: () => Buffer } };
    expect(sent.url).toContain(`measures/${measureId}/attachments`);
    expect(sent.headers?.['Content-Type']).toContain('multipart/form-data');
    expect(sent.data?.getBuffer().toString()).toContain('name="attachment"; filename="foto.jpg"');
    expect(api.get.mock.calls[0][0]).toMatchObject({ url: expect.stringContaining(`measures/${measureId}`) });
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ id: measureId, attachments: [{ id: attachmentId }] });
  });

  it('refuses to guess when the service names no attachment', async () => {
    const { controller, api } = makeController();
    api.post.mockResolvedValueOnce({ data: undefined } as never);

    await expect(controller.uploadMeasureAttachment(mockReq(), [file()], errandId, mockMunicipalityId, measureId, mockRes())).rejects.toMatchObject({
      status: 502,
    });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('unlinks an attachment from the measure and answers 204', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.unlinkMeasureAttachment(mockReq(), errandId, mockMunicipalityId, measureId, attachmentId, res);

    expect(api.delete.mock.calls[0][0]).toMatchObject({ url: expect.stringContaining(`measures/${measureId}/attachments/${attachmentId}`) });
    expect(res.statusCode).toBe(204);
  });
});
