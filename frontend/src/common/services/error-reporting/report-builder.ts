import { BuildReportParams, ErrorReportPayload } from './types';

export function buildErrorReport(params: BuildReportParams): ErrorReportPayload {
  const { formData, userInfo, errorDetails, applicationName, logBuffer, environment, appVersion, url, route } = params;

  return {
    description: formData.description,
    expectedBehavior: formData.expectedBehavior,
    stepsToReproduce: formData.stepsToReproduce,
    severity: formData.severity,

    timestamp: new Date().toISOString(),
    url,
    route,
    username: userInfo.username,
    userFullName: userInfo.fullName,
    environment,
    appVersion,
    applicationName,

    errorDetails: errorDetails || undefined,
    capturedLogs: logBuffer,
  };
}
