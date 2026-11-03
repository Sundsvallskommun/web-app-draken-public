import { isAxiosError } from 'axios';

// Axios errors carry technical text such as "Request failed with status code 500", so only messages
// the app throws itself are shown to the user. Everything else gets the fallback.
export const getUserErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && !isAxiosError(error) && error.message ? error.message : fallback;
