'use client';

import { PdfPreview } from '@common/components/template-preview/pdf-preview.component';
import { renderTemplatePdf, renderTemplatePdfPreview } from '@common/services/template-render-service';
import { useEffect, useRef, useState } from 'react';

interface TemplatePdfPreviewProps {
  identifier: string | undefined;
  parameters: { [key: string]: string | Object };
  debounceMs?: number;
  watermarked?: boolean;
  title?: string;
}

export const TemplatePdfPreview: React.FC<TemplatePdfPreviewProps> = ({
  identifier,
  parameters,
  debounceMs = 800,
  watermarked = false,
  title = 'Mallförhandsgranskning',
}) => {
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!identifier) {
      setPdfBase64('');
      setIsLoading(false);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const render = watermarked ? renderTemplatePdfPreview : renderTemplatePdf;
        const result = await render(identifier, parameters);
        if (requestIdRef.current !== requestId) return;
        setPdfBase64(result);
      } catch {
        if (requestIdRef.current !== requestId) return;
        setPdfBase64('');
        setError('Kunde inte skapa förhandsgranskning');
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, JSON.stringify(parameters), debounceMs, watermarked]);

  if (!identifier) {
    return null;
  }

  return <PdfPreview pdfBase64={pdfBase64} isLoading={isLoading} error={error} title={title} />;
};
