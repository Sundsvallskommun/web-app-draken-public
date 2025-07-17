export type ToastStatus = 'success' | 'error' | 'info' | 'warning';

export interface ToastOverrides {
  duration?: number;
  position?: 'top' | 'bottom';
  closeable?: boolean;
}

const statusOverrides: Partial<Record<ToastStatus, ToastOverrides>> = {
  success: {
    duration: 2000,
    closeable: true,
    position: 'bottom',
  },
  // Options for error, info, warning can be added similarly
};

interface ToastInput {
  status: ToastStatus;
  message: string;
}

export function getToastOptions({ status, message }: ToastInput) {
  const overrides = statusOverrides[status] ?? {};
  return {
    status,
    message,
    ...overrides,
  };
}
