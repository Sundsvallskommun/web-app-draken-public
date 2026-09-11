'use client';

import { Alert, Button } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Eye, FileText } from 'lucide-react';

import type { InvestigationReport } from './investigation-form-data';

interface InvestigationReportControlsProps {
  readonly documentKey: string;
  /** The form currently answers Ja to the completion question, saved or not. */
  readonly completedInDraft: boolean;
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
  completedInDraft,
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

  return (
    <div className="flex flex-col gap-16" data-cy={`investigation-report-${documentKey}`}>
      {completedInDraft && (
        <Alert type="info" data-cy="investigation-report-completed-notice">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>
              När du är klar med din utredning, ska du skapa en rapport och tilldela ärendet till LEX-ansvarig.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      )}
      <p className="text-small">
        När du har färdigställt utredningen kan du skapa en rapport. Rapporten kommer att läggas till som en bilaga på
        ärendet.
      </p>
      {completedInDraft && !canReport && !busy && (
        <p className="text-small" data-cy="investigation-report-save-hint">
          Spara utredningen först, så kan rapporten skapas.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-12">
        <Button
          type="button"
          variant="primary"
          leftIcon={<FileText />}
          disabled={!canReport || !canEdit}
          loading={busy}
          onClick={onGenerate}
          data-cy="investigation-report-generate"
        >
          Skapa rapport
        </Button>
        <Button
          type="button"
          variant="link"
          leftIcon={<Eye />}
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
