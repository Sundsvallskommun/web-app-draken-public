'use client';

import { Button } from '@sk-web-gui/react';
import dayjs from 'dayjs';

import type { InvestigationReport } from './investigation-form-data';

interface InvestigationReportControlsProps {
  readonly documentKey: string;
  /** The stored document is marked completed, so it is locked and may be reported. */
  readonly locked: boolean;
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly canEdit: boolean;
  readonly reports: readonly InvestigationReport[];
  readonly onGenerate: () => void;
  readonly onPreview: () => void;
  readonly onUnlock: () => void;
}

/**
 * The report controls at the end of an investigation document. A report is generated from the
 * stored document, so the document has to be saved as completed first; once it is, it is locked
 * and the owner can unlock it to change it and generate another, numbered report.
 */
export function InvestigationReportControls({
  documentKey,
  locked,
  dirty,
  busy,
  canEdit,
  reports,
  onGenerate,
  onPreview,
  onUnlock,
}: Readonly<InvestigationReportControlsProps>) {
  const canReport = locked && !dirty && !busy;
  const guidance = !locked
    ? 'Markera utredningen som klar och spara den för att kunna skapa en rapport. Rapporten läggs som en bilaga på ärendet.'
    : dirty
    ? 'Spara utredningen innan du skapar en rapport.'
    : 'Utredningen är klar och låst. Rapporten skapas från den sparade utredningen och läggs som en bilaga på ärendet.';

  return (
    <div className="flex flex-col gap-16" data-cy={`investigation-report-${documentKey}`}>
      <p className="text-small">{guidance}</p>
      <div className="flex flex-wrap items-center gap-12">
        <Button
          type="button"
          variant="primary"
          disabled={!canReport || !canEdit}
          loading={busy}
          onClick={onGenerate}
          data-cy="investigation-report-generate"
        >
          Skapa rapport
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!canReport}
          onClick={onPreview}
          data-cy="investigation-report-preview"
        >
          Förhandsgranska rapport
        </Button>
        {locked && canEdit && (
          <Button
            type="button"
            variant="tertiary"
            disabled={busy}
            onClick={onUnlock}
            data-cy="investigation-report-unlock"
          >
            Lås upp utredningen
          </Button>
        )}
      </div>
      {reports.length > 0 && (
        <div>
          <h4 className="text-label-medium font-bold">Skapade rapporter</h4>
          <ul className="mt-4 flex flex-col gap-4" data-cy="investigation-report-list">
            {reports.map((report, index) => (
              <li key={`${report.fileName}-${index}`} className="text-small">
                <span className="font-bold">{report.fileName}</span>{' '}
                <span>
                  · <time dateTime={report.generatedAt}>{dayjs(report.generatedAt).format('YYYY-MM-DD HH:mm')}</time> av{' '}
                  {report.generatedBy}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-small">Rapporterna finns under fliken Bilagor.</p>
        </div>
      )}
    </div>
  );
}
