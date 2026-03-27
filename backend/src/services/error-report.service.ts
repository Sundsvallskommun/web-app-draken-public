import { ErrorReportHandler, ErrorReportResponse, ErrorReportResult, ProcessedErrorReport } from '@/interfaces/error-report.interface';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

function sanitizeForExternal(report: ProcessedErrorReport) {
  return {
    id: report.id,
    severity: report.severity,
    description: report.description,
    expectedBehavior: report.expectedBehavior,
    stepsToReproduce: report.stepsToReproduce,
    username: report.submittedBy,
    applicationName: report.applicationName,
    route: report.route,
    browser: report.environment.browser,
    os: report.environment.os,
    screenResolution: report.environment.screenResolution,
    timestamp: report.timestamp,
    receivedAt: report.receivedAt,
    hasErrorDetails: !!report.errorDetails,
    errorName: report.errorDetails?.name,
    errorMessage: report.errorDetails?.message,
    logCount: report.capturedLogs.length,
  };
}

class LogFileHandler implements ErrorReportHandler {
  async handle(report: ProcessedErrorReport): Promise<ErrorReportResult> {
    const sanitized = {
      id: report.id,
      severity: report.severity,
      description: report.description,
      username: report.submittedBy,
      url: report.url,
      route: report.route,
      browser: report.environment.browser,
      os: report.environment.os,
      applicationName: report.applicationName,
      timestamp: report.timestamp,
      receivedAt: report.receivedAt,
      hasErrorDetails: !!report.errorDetails,
      logCount: report.capturedLogs.length,
    };

    logger.info(`[ERROR-REPORT] ${JSON.stringify(sanitized)}`);

    if (report.errorDetails) {
      logger.info(`[ERROR-REPORT-DETAILS] id=${report.id} error=${report.errorDetails.name}: ${report.errorDetails.message}`);
    }

    return { success: true, handler: 'LogFileHandler' };
  }
}

class ExternalApiHandler implements ErrorReportHandler {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async handle(report: ProcessedErrorReport): Promise<ErrorReportResult> {
    try {
      await axios.post(this.apiUrl, sanitizeForExternal(report), {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return { success: true, handler: 'ExternalApiHandler' };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`ExternalApiHandler failed: ${message}`);
      return { success: false, handler: 'ExternalApiHandler', error: message };
    }
  }
}

class NotificationHandler implements ErrorReportHandler {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async handle(report: ProcessedErrorReport): Promise<ErrorReportResult> {
    const summary = {
      text: `Felrapport: ${report.severity.toUpperCase()} - ${report.description.slice(0, 200)}`,
      id: report.id,
      user: report.submittedBy,
      app: report.applicationName,
      route: report.route,
      browser: report.environment.browser,
      timestamp: report.timestamp,
    };

    try {
      await axios.post(this.webhookUrl, summary, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      return { success: true, handler: 'NotificationHandler' };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.error(`NotificationHandler failed: ${message}`);
      return { success: false, handler: 'NotificationHandler', error: message };
    }
  }
}

export class ErrorReportService {
  private handlers: ErrorReportHandler[];

  constructor() {
    this.handlers = this.initializeHandlers();
  }

  private initializeHandlers(): ErrorReportHandler[] {
    const handlers: ErrorReportHandler[] = [new LogFileHandler()];

    if (process.env.ERROR_REPORT_API_URL) {
      handlers.push(new ExternalApiHandler(process.env.ERROR_REPORT_API_URL));
    }

    if (process.env.ERROR_REPORT_NOTIFICATION_URL) {
      handlers.push(new NotificationHandler(process.env.ERROR_REPORT_NOTIFICATION_URL));
    }

    return handlers;
  }

  async processReport(reportData: any, submittedBy: string): Promise<ErrorReportResponse> {
    const id = uuidv4();
    const processedReport: ProcessedErrorReport = {
      ...reportData,
      id,
      submittedBy,
      username: submittedBy,
      userFullName: submittedBy,
      receivedAt: new Date().toISOString(),
    };

    const results = await Promise.allSettled(this.handlers.map((h) => h.handle(processedReport)));

    const handlerResults: ErrorReportResult[] = results.map((result, i) => {
      if (result.status === 'rejected') {
        logger.error(`Error report handler ${i} failed: ${result.reason}`);
        return { success: false, handler: `handler-${i}`, error: String(result.reason) };
      }
      return result.value;
    });

    const externalHandlers = handlerResults.filter((r) => r.handler !== 'LogFileHandler');
    const hasExternalHandlers = externalHandlers.length > 0;
    const allExternalFailed = hasExternalHandlers && externalHandlers.every((r) => !r.success);

    let status: 'received' | 'forwarded' | 'failed';
    if (allExternalFailed) {
      status = 'failed';
    } else if (hasExternalHandlers && externalHandlers.some((r) => r.success)) {
      status = 'forwarded';
    } else {
      status = 'received';
    }

    return {
      id,
      message: status === 'failed' ? 'Felrapporten loggades men kunde inte vidarebefordras' : 'Felrapporten har tagits emot',
      status,
    };
  }
}
