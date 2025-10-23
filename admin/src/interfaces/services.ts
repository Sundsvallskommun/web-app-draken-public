export interface ServiceResponse<T = unknown> {
  data?: T;
  error?: number | string | boolean;
  message?: string;
}
