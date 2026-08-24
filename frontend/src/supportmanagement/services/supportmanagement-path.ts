export const trimSupportManagementPath = (value: string): string =>
  value.trim().replace(/^\/+/, '').replace(/\/+$/, '');

export const normalizeSupportManagementResourcePath = (value: string | undefined): string =>
  trimSupportManagementPath(value ?? '').toUpperCase();
