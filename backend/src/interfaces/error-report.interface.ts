export type ErrorReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CapturedLogEntry {
  level: string;
  message: string;
  timestamp: string;
  source?: string;
}

export interface ClientEnvironment {
  browser: string;
  os: string;
  screenResolution: string;
  viewportSize: string;
  language: string;
  userAgent: string;
}

export interface AppVersion {
  commit: string;
  branch: string;
  updatedAt: string;
}

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
}

export interface ErrorReportPayload {
  description: string;
  expectedBehavior?: string;
  stepsToReproduce?: string;
  severity: ErrorReportSeverity;
  timestamp: string;
  url: string;
  route: string;
  username: string;
  userFullName: string;
  environment: ClientEnvironment;
  appVersion: AppVersion | null;
  applicationName: string;
  errorDetails?: ErrorDetails;
  capturedLogs: CapturedLogEntry[];
}

export interface ProcessedErrorReport extends ErrorReportPayload {
  id: string;
  submittedBy: string;
  receivedAt: string;
}

export interface ErrorReportResult {
  success: boolean;
  handler: string;
  error?: string;
}

export interface ErrorReportResponse {
  id: string;
  message: string;
  status: 'received' | 'forwarded' | 'failed';
}

export interface ErrorReportHandler {
  handle(report: ProcessedErrorReport): Promise<ErrorReportResult>;
}
