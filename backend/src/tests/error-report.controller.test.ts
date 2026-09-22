import { ErrorReportController } from '@/controllers/error-report.controller';
import { ErrorReportDto } from '@/dtos/error-report.dto';
import { ErrorReportResponse } from '@/interfaces/error-report.interface';

import { mockReq } from './helpers/http';

interface ErrorReportServiceStub {
  processReport: ReturnType<typeof vi.fn>;
}

interface FeatureFlagServiceStub {
  isEnabled: ReturnType<typeof vi.fn>;
}

const reportDto = { description: 'Test report' } as ErrorReportDto;
const processedResponse: ErrorReportResponse = {
  id: 'report-id',
  message: 'Felrapporten har tagits emot',
  status: 'received',
};

const makeController = (enabled: boolean) => {
  const controller = new ErrorReportController();
  const errorReportService: ErrorReportServiceStub = {
    processReport: vi.fn(async () => processedResponse),
  };
  const featureFlagService: FeatureFlagServiceStub = {
    isEnabled: vi.fn(async () => enabled),
  };
  (controller as unknown as { errorReportService: ErrorReportServiceStub }).errorReportService = errorReportService;
  (controller as unknown as { featureFlagService: FeatureFlagServiceStub }).featureFlagService = featureFlagService;
  return { controller, errorReportService, featureFlagService };
};

describe('ErrorReportController', () => {
  it('does not accept reports when useErrorReporting is disabled', async () => {
    const { controller, errorReportService, featureFlagService } = makeController(false);
    const req = mockReq();

    await expect(controller.submitErrorReport(req, reportDto)).rejects.toMatchObject({ status: 404 });
    expect(featureFlagService.isEnabled).toHaveBeenCalledWith(req.user, 'useErrorReporting');
    expect(errorReportService.processReport).not.toHaveBeenCalled();
  });

  it('processes reports when useErrorReporting is enabled for the current Drake', async () => {
    const { controller, errorReportService } = makeController(true);
    const req = mockReq();

    await expect(controller.submitErrorReport(req, reportDto)).resolves.toEqual({
      data: processedResponse,
      message: 'success',
    });
    expect(errorReportService.processReport).toHaveBeenCalledWith(reportDto, req.user.username);
  });
});
