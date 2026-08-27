'use client';

import type { IafVofInvestigationClassificationLabelTree } from '@supportmanagement/investigation/avvikelse/iaf-vof-investigation-classification-policy';
import {
  applyIafLabelClassificationSelection,
  createIafLabelClassificationModel,
  getIafLabelClassificationSelection,
  LabelClassification,
  type LabelClassificationLegalBaseRule,
} from '@supportmanagement/investigation/avvikelse/label-classification';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { type FC, useEffect, useMemo, useRef } from 'react';
import { type FieldError, useFormContext, useWatch } from 'react-hook-form';

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

const requireLabelTree = (
  labelTree: IafVofInvestigationClassificationLabelTree | undefined
): IafVofInvestigationClassificationLabelTree => {
  if (!labelTree) throw new Error('Klassificeringsprofilens labelträd saknas.');
  return labelTree;
};

const compareLegalBases = (left: string, right: string): number => {
  if (left === right) return 0;
  return left < right ? -1 : 1;
};

const parseLegalBasesKey = (key: string | undefined): string[] | undefined => {
  if (key === undefined) return undefined;
  return key === '' ? [] : key.split('|');
};

export const IafLabelCategorization: FC<{
  supportMetadata?: SupportMetadata;
  disabled?: boolean;
  labelTree?: IafVofInvestigationClassificationLabelTree;
  legalBases?: readonly string[];
  legalBaseRules?: readonly LabelClassificationLegalBaseRule[];
  onClassificationChange?: () => void;
}> = ({ supportMetadata, disabled = false, labelTree, legalBases, legalBaseRules = [], onClassificationChange }) => {
  const configuredLabelTree = requireLabelTree(labelTree);
  const {
    control,
    register,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<SupportErrand>();
  // These metadata-backed values have no native inputs to spread register()
  // onto. Register them during render so watch/setValue are connected before
  // the first user interaction, including in an optimized production build.
  register('labels');
  register('category', { required: 'Välj avvikelsetyp' });
  register('type', { required: 'Välj avvikelsetyp' });
  register('subType', {
    validate: (value, values) => !values.classificationHasSubTypes || Boolean(value) || 'Välj underkategori',
  });
  register('classificationHasSubTypes');
  const [watchedLabels, category, type, subType] = useWatch({
    control,
    name: ['labels', 'category', 'type', 'subType'],
  });
  const labels = useMemo(() => watchedLabels ?? [], [watchedLabels]);
  // Sorted with an explicit string comparator so the memo key is a stable, deterministic
  // ordering regardless of the order legal bases arrive in.
  const legalBasesKey = legalBases === undefined ? undefined : [...legalBases].sort(compareLegalBases).join('|');
  const normalizedLegalBases = useMemo(() => parseLegalBasesKey(legalBasesKey), [legalBasesKey]);
  const completeModel = useMemo(
    () => createIafLabelClassificationModel(supportMetadata?.labels?.labelStructure, configuredLabelTree),
    [configuredLabelTree, supportMetadata?.labels?.labelStructure]
  );
  const model = useMemo(
    () =>
      createIafLabelClassificationModel(
        supportMetadata?.labels?.labelStructure,
        configuredLabelTree,
        normalizedLegalBases,
        legalBaseRules
      ),
    [configuredLabelTree, legalBaseRules, normalizedLegalBases, supportMetadata?.labels?.labelStructure]
  );
  const selection = useMemo(
    () => getIafLabelClassificationSelection(model, labels, { category, type, subType }),
    [category, labels, model, subType, type]
  );
  const currentClassification = useMemo(
    () => applyIafLabelClassificationSelection(model, labels, selection),
    [labels, model, selection]
  );
  const completeSelection = useMemo(
    () => getIafLabelClassificationSelection(completeModel, labels, { category, type, subType }),
    [category, completeModel, labels, subType, type]
  );
  const previousLegalBasesKey = useRef(legalBasesKey);

  useEffect(() => {
    const previousKey = previousLegalBasesKey.current;
    previousLegalBasesKey.current = legalBasesKey;
    if (previousKey === legalBasesKey || !completeSelection.typeCode || selection.typeCode) return;

    const update = applyIafLabelClassificationSelection(completeModel, labels, {});
    onClassificationChange?.();
    setValue('labels', update.labels, { shouldDirty: true });
    setValue('category', update.category, { shouldDirty: true });
    setValue('type', update.type, { shouldDirty: true });
    setValue('subType', update.subType, { shouldDirty: true });
    setValue('classificationHasSubTypes', false, { shouldDirty: false });
    void trigger(['category', 'type', 'subType']);
  }, [
    completeModel,
    completeSelection.typeCode,
    labels,
    legalBasesKey,
    onClassificationChange,
    selection.typeCode,
    setValue,
    trigger,
  ]);

  useEffect(() => {
    // The form values and labels are the canonical selection. Metadata arriving
    // asynchronously may enrich validation, but must never write those fields
    // back from a stale render and overwrite a user choice.
    if (model.bindings.length === 0 || !selection.typeCode) return;

    setValue('classificationHasSubTypes', currentClassification.requiresSubType, { shouldDirty: false });
    void trigger(['category', 'type', 'subType']);
  }, [currentClassification.requiresSubType, model.bindings.length, selection.typeCode, setValue, trigger]);

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
          // Mark the owning form dirty before publishing the individual field updates.
          onClassificationChange?.();
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
