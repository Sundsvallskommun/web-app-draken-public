'use client';

import { ErrorDetails } from '@common/services/error-reporting';
import { useCallback, useEffect, useState } from 'react';
import { ErrorReportModal } from './error-report-modal';

interface ErrorReportProviderProps {
  errorDetails?: ErrorDetails | null;
}

export function ErrorReportProvider({ errorDetails }: ErrorReportProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('open-error-report', handleOpen);
    return () => window.removeEventListener('open-error-report', handleOpen);
  }, [handleOpen]);

  return <ErrorReportModal show={isOpen} onClose={() => setIsOpen(false)} errorDetails={errorDetails} />;
}
