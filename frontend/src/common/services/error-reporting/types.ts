export type ErrorReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';
export type LogSource = 'console' | 'network' | 'unhandled' | 'promise-rejection';

export interface CapturedLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  source?: LogSource;
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

export interface UserInfo {
  username: string;
  fullName: string;
}

export interface ErrorReportFormData {
  description: string;
  expectedBehavior: string;
  stepsToReproduce: string;
  severity: ErrorReportSeverity;
}

export interface ErrorReportPayload {
  description: string;
  expectedBehavior: string;
  stepsToReproduce: string;
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

export interface ErrorReportResponse {
  id: string;
  message: string;
  status: 'received' | 'forwarded' | 'failed';
}

export interface BuildReportParams {
  formData: ErrorReportFormData;
  userInfo: UserInfo;
  errorDetails?: ErrorDetails;
  applicationName: string;
  logBuffer: CapturedLogEntry[];
  environment: ClientEnvironment;
  appVersion: AppVersion | null;
  url: string;
  route: string;
}
