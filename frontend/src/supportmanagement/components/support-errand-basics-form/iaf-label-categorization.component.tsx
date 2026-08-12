'use client';

import {
  applyIafLabelClassificationSelection,
  createIafLabelClassificationModel,
  getIafLabelClassificationSelection,
  LabelClassification,
} from '@supportmanagement/investigation/label-classification';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { type FC, useEffect, useMemo } from 'react';
import { type FieldError, useFormContext } from 'react-hook-form';

const iafClassificationContent = {
  typeLabel: 'Avvikelsetyp (obligatoriskt)',
  typePlaceholder: 'Välj avvikelsetyp',
  typeEmptyPlaceholder: 'Inga avvikelsetyper tillgängliga',
  typeHelperText: 'Huvudkategori för avvikelsen',
  subtypeLabel: 'Underkategori (obligatorisk)',
  subtypePlaceholder: 'Välj underkategori',
  subtypeBeforeTypePlaceholder: 'Välj avvikelsetyp först',
  subtypeEmptyPlaceholder: 'Saknar underkategorier',
  subtypeHelperText: 'Underkategori för avvikelsen',
} as const;

const errorMessage = (error: FieldError | undefined): string | undefined =>
  typeof error?.message === 'string' ? error.message : undefined;

export const IafLabelCategorization: FC<{
  supportMetadata?: SupportMetadata;
  disabled?: boolean;
}> = ({ supportMetadata, disabled = false }) => {
  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SupportErrand>();
  const watchedLabels = watch('labels');
  const category = watch('category');
  const type = watch('type');
  const subType = watch('subType');
  const labels = useMemo(() => watchedLabels ?? [], [watchedLabels]);
  const model = useMemo(
    () => createIafLabelClassificationModel(supportMetadata?.labels?.labelStructure),
    [supportMetadata?.labels?.labelStructure]
  );
  const selection = useMemo(
    () => getIafLabelClassificationSelection(model, labels, { category, type, subType }),
    [category, labels, model, subType, type]
  );
  const currentClassification = useMemo(
    () => applyIafLabelClassificationSelection(model, labels, selection),
    [labels, model, selection]
  );

  useEffect(() => {
    // Metadata is loaded asynchronously and old errands may contain a category
    // unknown to the current tree. Never erase persisted classification merely
    // because the adapter cannot resolve it. Explicit user changes are handled
    // by onChange below.
    if (model.bindings.length === 0 || !selection.typeCode) return;

    setValue('classificationHasSubTypes', currentClassification.requiresSubType, { shouldDirty: false });
    if (currentClassification.labelsChanged) {
      setValue('labels', currentClassification.labels, { shouldDirty: false });
    }

    setValue('category', currentClassification.category, { shouldDirty: false });
    setValue('type', currentClassification.type, { shouldDirty: false });
    setValue('subType', currentClassification.subType, { shouldDirty: false });
    void trigger(['category', 'type', 'subType']);
  }, [currentClassification, model.bindings.length, selection.typeCode, setValue, trigger]);

  return (
    <section
      className="my-md w-full"
      aria-labelledby="iaf-label-categorization-heading"
      data-cy="iaf-label-categorization"
    >
      <div className="mb-lg">
        <h3 id="iaf-label-categorization-heading" className="text-h4-md">
          Kategorisering
        </h3>
        <p className="mt-xs">Välj avvikelsetyp och detaljerad typ för att klassificera ärendet.</p>
      </div>

      <LabelClassification
        catalog={model.catalog}
        value={selection}
        disabled={disabled}
        content={iafClassificationContent}
        errors={{
          type: errorMessage(errors.category ?? (!selection.typeCode ? errors.type : undefined)),
          subtype: selection.typeCode ? errorMessage(errors.subType) : undefined,
        }}
        onChange={(nextSelection) => {
          const update = applyIafLabelClassificationSelection(model, labels, nextSelection);
          setValue('labels', update.labels, { shouldDirty: true });
          setValue('category', update.category, { shouldDirty: true });
          setValue('type', update.type, { shouldDirty: true });
          setValue('subType', update.subType, { shouldDirty: true });
          setValue('classificationHasSubTypes', update.requiresSubType, { shouldDirty: false });
          void trigger(['category', 'type', 'subType']);
        }}
      />
    </section>
  );
};
