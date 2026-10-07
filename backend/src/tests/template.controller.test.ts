import { TemplateController } from '@/controllers/template.controller';

import { mockReq } from './helpers/http';
import { mockMunicipalityId } from './helpers/mock-data';

const selector = {
  identifier: 'referral-enforcement-authority',
  content: '',
  parameters: { caseNumber: 'AOT-26100008' },
};

const makeController = () => {
  const controller = new TemplateController();
  const api = {
    post: vi.fn(async (_config: { url?: string; data?: unknown }) => ({
      data: { output: 'JVBERi0xLg==' },
      message: 'success',
    })),
  };
  Object.assign(controller as object, { apiService: api });
  return { controller, api };
};

describe('rendering a template as pdf', () => {
  it('asks the templating service for the pdf of a stored template', async () => {
    const { controller, api } = makeController();

    const answer = await controller.decisionPreviewPdf(mockReq(), selector);

    expect(answer.data.output).toBe('JVBERi0xLg==');
    expect(api.post.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining(`${mockMunicipalityId}/render/pdf`),
      data: selector,
    });
  });

  it('asks for the watermarked pdf when the handler is only looking', async () => {
    const { controller, api } = makeController();

    const answer = await controller.previewPdfWithWatermark(mockReq(), selector);

    expect(answer.data.output).toBe('JVBERi0xLg==');
    expect(api.post.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining(`${mockMunicipalityId}/render/pdf/preview`),
      data: selector,
    });
  });

  it('keeps the two apart, so a document meant to be sent carries no watermark', async () => {
    const { controller, api } = makeController();

    await controller.decisionPreviewPdf(mockReq(), selector);

    expect(api.post.mock.calls[0][0].url).not.toContain('/preview');
  });
});
