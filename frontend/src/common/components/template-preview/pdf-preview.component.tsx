'use client';

import { Disclosure } from '@sk-web-gui/react';
import { FC } from 'react';

interface PdfPreviewProps {
  pdfBase64: string;
  isLoading: boolean;
  error: string;
  title: string;
  dataCy?: string;
}

export const PdfPreview: FC<PdfPreviewProps> = ({
  pdfBase64,
  isLoading,
  error,
  title,
  dataCy = 'decision-template-preview',
}) => {
  if (!pdfBase64 && !isLoading && !error) {
    return null;
  }

  const ifError = error ? (
    <div className="flex justify-center items-center h-[20rem] text-error" data-cy={`${dataCy}-error`}>
      {error}
    </div>
  ) : (
    <iframe
      src={`data:application/pdf;base64,${pdfBase64}#pagemode=none`}
      className="w-full h-[80rem] border-0"
      title={title}
      data-cy={`${dataCy}-content`}
    />
  );

  const content = isLoading ? (
    <div className="flex justify-center items-center h-[60rem] text-dark-secondary" data-cy={`${dataCy}-loading`}>
      Laddar förhandsgranskning...
    </div>
  ) : (
    ifError
  );

  return (
    <Disclosure variant="alt" initalOpen data-cy={dataCy} className="mb-24">
      <Disclosure.Header>
        <Disclosure.Title>{title}</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>{content}</Disclosure.Content>
    </Disclosure>
  );
};
