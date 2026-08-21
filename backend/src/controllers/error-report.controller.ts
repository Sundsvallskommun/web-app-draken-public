import { Body, Controller, HttpCode, Post, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { ErrorReportDto } from '@/dtos/error-report.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { ErrorReportResponse } from '@/interfaces/error-report.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import { ErrorReportService } from '@/services/error-report.service';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { logger } from '@/utils/logger';

@Controller()
export class ErrorReportController {
  private errorReportService = new ErrorReportService();
  private featureFlagService = new FeatureFlagService();

  @Post('/error-reports')
  @HttpCode(201)
  @OpenAPI({ summary: 'Submit an error report from the client' })
  @UseBefore(authMiddleware, validationMiddleware(ErrorReportDto, 'body'))
  async submitErrorReport(@Req() req: RequestWithUser, @Body() reportDto: ErrorReportDto): Promise<{ data: ErrorReportResponse; message: string }> {
    const enabled = await this.featureFlagService.isEnabled(req.user, 'useErrorReporting');
    if (!enabled) {
      throw new HttpException(404, 'Not Found');
    }

    try {
      const result = await this.errorReportService.processReport(reportDto, req.user.username);
      return { data: result, message: 'success' };
    } catch (error) {
      logger.error('Error processing error report:', error);
      throw new HttpException(500, 'Failed to process error report');
    }
  }
}
