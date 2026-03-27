'use client';

import { ErrorDetails } from '@common/services/error-reporting';
import { Button } from '@sk-web-gui/react';
import { AlertTriangle, Bug, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ErrorReportModal } from '@common/components/error-report/error-report-modal';

interface ErrorFallbackProps {
  errorDetails: ErrorDetails | null;
  onReset: () => void;
}

export function ErrorFallback({ errorDetails, onReset }: ErrorFallbackProps) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-100 p-lg">
      <div className="max-w-[48rem] w-full text-center">
        <AlertTriangle className="w-[6rem] h-[6rem] text-warning-surface-primary mx-auto mb-lg" />

        <h1 className="text-h2-sm md:text-h2-md mb-md">Något gick fel</h1>

        <p className="text-large text-content-secondary mb-xl">
          Ett oväntat fel inträffade. Du kan rapportera felet för att hjälpa oss förbättra systemet, eller försöka ladda
          om sidan.
        </p>

        <div className="flex gap-md justify-center flex-wrap">
          <Button variant="primary" color="vattjom" onClick={() => setShowReportModal(true)}>
            <Bug className="w-[1.8rem] h-[1.8rem] mr-sm" />
            Rapportera fel
          </Button>

          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RefreshCw className="w-[1.8rem] h-[1.8rem] mr-sm" />
            Ladda om sidan
          </Button>
        </div>
      </div>

      <ErrorReportModal show={showReportModal} onClose={() => setShowReportModal(false)} errorDetails={errorDetails} />
    </div>
  );
}
