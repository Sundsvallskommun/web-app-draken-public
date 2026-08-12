'use client';

import { Alert, Label } from '@sk-web-gui/react';
import {
  LabelClassification,
  LabelClassificationCatalog,
  LabelClassificationSelection,
} from '@supportmanagement/investigation/label-classification';

import { formatInvestigationLabTimestamp } from './investigation-schema-lab-time';

interface InvestigationLabelClassificationPanelProps {
  catalog: LabelClassificationCatalog;
  value: LabelClassificationSelection;
  canWrite: boolean;
  savedAt?: string;
  notice?: string;
  onChange: (value: LabelClassificationSelection) => void;
}

export function InvestigationLabelClassificationPanel({
  catalog,
  value,
  canWrite,
  savedAt,
  notice,
  onChange,
}: InvestigationLabelClassificationPanelProps) {
  return (
    <section
      className="mb-32 min-w-0 max-w-full rounded-12 border-1 border-vattjom-surface-primary bg-vattjom-background-100 p-16 sm:p-20"
      aria-labelledby="investigation-label-classification-heading"
      data-cy="investigation-label-classification"
    >
      <div className="mb-16 flex flex-wrap items-center gap-8">
        <h3 id="investigation-label-classification-heading" className="text-h4-md">
          Ärendeklassificering
        </h3>
        <Label rounded inverted color="vattjom">
          SupportManagement-labels
        </Label>
      </div>
      <p className="mb-16 text-small">
        Avvikelsetyp och detaljerad typ av avvikelse tillhör ärendets labels och sparas därför separat från utredningens
        JSON. Tillgängliga alternativ styrs av valda lagrum i formuläret.
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
