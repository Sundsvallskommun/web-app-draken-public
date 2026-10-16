import { SupportMeasureController } from '@/controllers/supportmanagement/support-measure.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockAdUsername, mockMunicipalityId } from './helpers/mock-data';

const errandId = '88833b47-c68b-4798-93ba-b491961c2cd5';
const measureId = '8ed7729b-9fa7-49f1-80ea-4fd54997844f';

const makeController = () => {
  const controller = new SupportMeasureController();
  const api = {
    get: vi.fn(async (_config: { url?: string }) => ({ data: [{ id: measureId, title: 'Ålderskontroll' }] })),
    post: vi.fn(async (config: { data?: { type: string; title: string } }) => ({ data: { id: measureId, ...config.data } })),
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
