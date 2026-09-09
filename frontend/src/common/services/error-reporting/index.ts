export { collectEnvironmentInfo, getAppVersion, parseBrowserInfo, parseOsInfo } from './environment-collector';
export { captureNetworkError, clearLogBuffer, getLogBuffer, initLogCapture } from './log-capture';
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
