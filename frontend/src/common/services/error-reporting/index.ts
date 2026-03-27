export { initLogCapture, getLogBuffer, clearLogBuffer, captureNetworkError } from './log-capture';
export { collectEnvironmentInfo, getAppVersion, parseBrowserInfo, parseOsInfo } from './environment-collector';
export { buildErrorReport } from './report-builder';
export type {
  AppVersion,
  BuildReportParams,
  CapturedLogEntry,
  ClientEnvironment,
  ErrorDetails,
  ErrorReportFormData,
  ErrorReportPayload,
  ErrorReportResponse,
  ErrorReportSeverity,
  LogLevel,
  LogSource,
  UserInfo,
} from './types';
