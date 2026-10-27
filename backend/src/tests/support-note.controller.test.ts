import { SupportNoteController } from '@/controllers/supportmanagement/support-note.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockNoteId, mockSupportErrandId } from './helpers/mock-data';

const makeController = (storedContext = 'SUPPORT') => {
  const controller = new SupportNoteController();
  const api = {
    get: vi.fn(async (_config: { url?: string }) => ({ data: { id: mockNoteId, context: storedContext } })),
    post: vi.fn(async (_config: { url?: string; data?: { context?: string } }) => ({ data: {} })),
    patch: vi.fn(async (_config: { url?: string }) => ({ data: {} })),
    delete: vi.fn(async (_config: { url?: string }) => ({ data: {} })),
  };
  Object.assign(controller as object, { apiService: api });
  return { controller, api };
};

const fetchedContext = (api: ReturnType<typeof makeController>['api']) =>
  new URL(api.get.mock.calls[0][0].url!, 'http://x').searchParams.get('context');

describe('reading notes', () => {
  it('reads comments when no note type is given', async () => {
    const { controller, api } = makeController();

    await controller.fetchSupportNotes(mockReq(), mockSupportErrandId, mockMunicipalityId, undefined, mockRes());

    expect(fetchedContext(api)).toBe('SUPPORT');
  });

  it('reads tjänsteanteckningar by their own context', async () => {
    const { controller, api } = makeController();

    await controller.fetchSupportNotes(mockReq(), mockSupportErrandId, mockMunicipalityId, 'PUBLIC', mockRes());

    expect(fetchedContext(api)).toBe('SERVICE_NOTE');
  });

  it('refuses an unknown note type instead of filtering on nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.fetchSupportNotes(mockReq(), mockSupportErrandId, mockMunicipalityId, 'UNKNOWN' as never, res);

    expect(res.statusCode).toBe(400);
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe('creating notes', () => {
  it('saves a comment when no note type is given', async () => {
    const { controller, api } = makeController();

    await controller.createSupportNote(mockReq(), mockSupportErrandId, mockMunicipalityId, { body: 'Hej' }, mockRes());

    expect(api.post.mock.calls[0][0].data?.context).toBe('SUPPORT');
  });

  it('saves a tjänsteanteckning under its own context', async () => {
    const { controller, api } = makeController();

    await controller.createSupportNote(mockReq(), mockSupportErrandId, mockMunicipalityId, { body: 'Hej', noteType: 'PUBLIC' }, mockRes());

    expect(api.post.mock.calls[0][0].data?.context).toBe('SERVICE_NOTE');
  });
});

describe('changing and removing notes', () => {
  it('updates a comment', async () => {
    const { controller, api } = makeController('SUPPORT');
    const res = mockRes();

    await controller.updateSupportNote(mockReq(), mockMunicipalityId, mockSupportErrandId, mockNoteId, { body: 'Hej' }, res);

    expect(res.statusCode).toBe(200);
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  it('deletes a comment', async () => {
    const { controller, api } = makeController('SUPPORT');
    const res = mockRes();

    await controller.deleteSupportNote(mockReq(), mockMunicipalityId, mockSupportErrandId, mockNoteId, res);

    expect(res.statusCode).toBe(204);
    expect(api.delete).toHaveBeenCalledTimes(1);
  });

  it('refuses to update a tjänsteanteckning', async () => {
    const { controller, api } = makeController('SERVICE_NOTE');
    const res = mockRes();

    await controller.updateSupportNote(mockReq(), mockMunicipalityId, mockSupportErrandId, mockNoteId, { body: 'Hej' }, res);

    expect(res.statusCode).toBe(403);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('refuses to delete a tjänsteanteckning', async () => {
    const { controller, api } = makeController('SERVICE_NOTE');
    const res = mockRes();

    await controller.deleteSupportNote(mockReq(), mockMunicipalityId, mockSupportErrandId, mockNoteId, res);

    expect(res.statusCode).toBe(403);
    expect(api.delete).not.toHaveBeenCalled();
  });
});
