'use client';

import { apiService, ApiResponse } from '@common/services/api-service';
import {
  captureNetworkError,
  initLogCapture,
  ErrorReportPayload,
  ErrorReportResponse,
} from '@common/services/error-reporting';
import axios from 'axios';

export async function submitErrorReport(
  payload: ErrorReportPayload,
): Promise<ApiResponse<ErrorReportResponse>> {
  const res = await apiService.post<ApiResponse<ErrorReportResponse>, ErrorReportPayload>(
    'error-reports',
    payload,
  );
  return res.data;
}

let initialized = false;

export function initErrorReporting(): void {
  if (initialized) return;
  initialized = true;

  initLogCapture();

  axios.interceptors.response.use(undefined, (error) => {
    const url = error?.config?.url ?? 'unknown';
    if (!url.includes('error-reports')) {
      const status = error?.response?.status ?? 0;
      const message = error?.message ?? 'Network error';
      captureNetworkError(url, status, message);
    }
    return Promise.reject(error);
  });
}
