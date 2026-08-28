'use client';

import { Alert, Label } from '@sk-web-gui/react';
import {
  LabelClassification,
  LabelClassificationCatalog,
  LabelClassificationSelection,
} from '@supportmanagement/investigation/avvikelse/label-classification';

import { formatInvestigationLabTimestamp } from './investigation-schema-lab-time';

interface InvestigationLabelClassificationPanelProps {
  headingId: string;
  catalog: LabelClassificationCatalog;
  value: LabelClassificationSelection;
  canWrite: boolean;
  savedAt?: string;
  notice?: string;
  onChange: (value: LabelClassificationSelection) => void;
}

export function InvestigationLabelClassificationPanel({
  headingId,
  catalog,
  value,
  canWrite,
  savedAt,
  notice,
  onChange,
}: Readonly<InvestigationLabelClassificationPanelProps>) {
  return (
    <section
      className="mb-32 min-w-0 max-w-full rounded-12 border-1 border-vattjom-surface-primary bg-vattjom-background-100 p-16 sm:p-20"
      aria-labelledby={headingId}
      data-cy="investigation-label-classification"
    >
      <div className="mb-16 flex min-w-0 max-w-full flex-wrap items-center gap-8">
        <h4 id={headingId} className="min-w-0 max-w-full break-words text-h4-md">
          Ärendeklassificering
        </h4>
        <Label rounded inverted color="vattjom" className="max-w-full break-words whitespace-normal">
          SupportManagement-labels
        </Label>
      </div>
      <p className="mb-16 text-small">
        Schemat placerar kontrollen här och valda lagrum styr vilka alternativ som visas. Avvikelsetyp och detaljerad
        typ tillhör fortfarande ärendets SupportManagement-labels och ingår därför inte i utredningens JSON.
      </p>
      {notice && (
        <div role="status" aria-live="polite">
          <Alert type="info" className="mb-16" data-cy="label-classification-notice">
            <Alert.Icon />
            <Alert.Content>
              <Alert.Content.Description>{notice}</Alert.Content.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}
      <LabelClassification catalog={catalog} value={value} onChange={onChange} disabled={!canWrite} />
      {savedAt && (
        <p className="mt-12 text-small">Labelmock sparad lokalt: {formatInvestigationLabTimestamp(savedAt)}</p>
      )}
    </section>
  );
}
