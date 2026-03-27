import { ErrorReportDto } from '@/dtos/error-report.dto';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { ErrorReportResponse } from '@/interfaces/error-report.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import { ErrorReportService } from '@/services/error-report.service';
import { logger } from '@/utils/logger';
import { Body, Controller, HttpCode, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class ErrorReportController {
  private errorReportService = new ErrorReportService();

  @Post('/error-reports')
  @HttpCode(201)
  @OpenAPI({ summary: 'Submit an error report from the client' })
  @UseBefore(authMiddleware, validationMiddleware(ErrorReportDto, 'body'))
  async submitErrorReport(
    @Req() req: RequestWithUser,
    @Body() reportDto: ErrorReportDto,
    @Res() response: any,
  ): Promise<{ data: ErrorReportResponse; message: string }> {
    try {
      const result = await this.errorReportService.processReport(reportDto, req.user.username);
      return response.status(201).send({ data: result, message: 'success' });
    } catch (e) {
      logger.error('Error processing error report:', e);
      return response.status(500).send({ data: null, message: 'Failed to process error report' });
    }
  }
}
