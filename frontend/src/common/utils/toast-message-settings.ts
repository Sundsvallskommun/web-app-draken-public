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
  // error, info, warning kan läggas till vid behov
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
