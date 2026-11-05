import { SupportMetadataController } from '@/controllers/supportmanagement/support-metadata.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockSupportNamespace } from './helpers/mock-data';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
}

/** `apiService` is a plain instance property - `private` is erased at runtime - so it can be replaced. */
const makeController = (data: unknown) => {
  const controller = new SupportMetadataController();
  const api: ApiStub = { get: vi.fn(async () => ({ data, message: 'success' })) };
  (controller as unknown as { apiService: ApiStub }).apiService = api;
  return { controller, api };
};

test('the metadata carries the namespace it was fetched for', async () => {
  const { controller } = makeController({ categories: [] });
  const res = mockRes();

  await controller.fetchSupportMetadata(mockReq(), mockMunicipalityId, res);

  // Upstream does not return it, and the frontend needs it to name namespace-scoped resources -
  // the JSON schema of an errand type is one.
  expect(res.body).toMatchObject({ categories: [], namespace: mockSupportNamespace });
});
