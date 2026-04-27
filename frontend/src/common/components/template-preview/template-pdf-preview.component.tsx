'use client';

import { renderTemplatePdf } from '@casedata/services/casedata-decision-service';
import { Disclosure } from '@sk-web-gui/react';
import { FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TemplatePdfPreviewProps {
  identifier: string | undefined;
  parameters: { [key: string]: string | Object };
  debounceMs?: number;
}

export const TemplatePdfPreview: React.FC<TemplatePdfPreviewProps> = ({
  identifier,
  parameters,
  debounceMs = 800,
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
        const result = await renderTemplatePdf(identifier, parameters);
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
  }, [identifier, JSON.stringify(parameters), debounceMs]);

  if (!identifier || (!pdfBase64 && !isLoading && !error)) {
    return null;
  }

  return (
    <Disclosure
      variant="alt"
      initalOpen
      data-cy="decision-template-preview"
      className="mb-24"
    >
      <Disclosure.Header>
        <Disclosure.Icon icon={<FileText size={18} />} />
        <Disclosure.Title>Mallförhandsgranskning</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        {isLoading ? (
          <div className="flex justify-center items-center h-[60rem] text-dark-secondary">
            Laddar förhandsgranskning...
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-[20rem] text-error">
            {error}
          </div>
        ) : (
          <iframe
            src={`data:application/pdf;base64,${pdfBase64}#pagemode=none`}
            className="w-full h-[80rem] border-0"
            title="Mallförhandsgranskning"
            data-cy="decision-template-preview-content"
          />
        )}
      </Disclosure.Content>
    </Disclosure>
  );
};
