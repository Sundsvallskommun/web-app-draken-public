'use client';

import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { type FC, useEffect, useMemo, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { avvikelseGroupedClassificationContent } from './avvikelse-classification-content';
import type { AvvikelseClassificationLabelTree } from './avvikelse-classification-policy';
import { AvvikelseGroupedClassificationFields } from './avvikelse-grouped-classification-fields.component';
import {
  applyAvvikelseGroupedClassificationSelection,
  type AvvikelseClassificationGroup,
  type AvvikelseGroupedClassificationUpdate,
  createAvvikelseGroupedClassificationModel,
  getAvvikelseGroupedClassificationSelection,
  getMissingAvvikelseGroupedClassificationChoices,
  type LabelClassificationLegalBaseRule,
  type LabelClassificationSelection,
} from './label-classification';
import type { InvestigationClassificationDraft } from './support-investigation-save-workflow';

const INCOMPLETE_CLASSIFICATION_MESSAGE = 'Välj avvikelsetyp och underkategori för varje valt lagrum.';

const normalizeLegalBase = (legalBase: string): string => legalBase.trim().toUpperCase();

/**
 * The investigation's categorization: one selector per group of chosen legal bases - HSL in one, SoL
 * and LSS together in the other - each offering the categories its legal bases allow. The chosen paths
 * are kept as the errand's labels, and the errand's own classification fields hold the one the policy
 * ranks first.
 */
export const AvvikelseGroupedLabelCategorization: FC<{
  supportMetadata?: SupportMetadata;
  disabled?: boolean;
  labelTree: AvvikelseClassificationLabelTree;
  legalBases: readonly string[];
  legalBaseRules: readonly LabelClassificationLegalBaseRule[];
  groups: readonly AvvikelseClassificationGroup[];
  errandClassificationGroupPriority: readonly string[];
  onClassificationChange?: () => void;
}> = ({
  supportMetadata,
  disabled = false,
  labelTree,
  legalBases,
  legalBaseRules,
  groups,
  errandClassificationGroupPriority,
  onClassificationChange,
}) => {
  const {
    control,
    register,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<InvestigationClassificationDraft>();
  const labelStructure = supportMetadata?.labels?.labelStructure;
  // A stable key, so a new array holding the same legal bases neither rebuilds the model nor reads as a change.
  const legalBasesKey = [...new Set(legalBases.map(normalizeLegalBase))].sort().join('|');
  const model = useMemo(
    () =>
      createAvvikelseGroupedClassificationModel(
        labelStructure,
        labelTree,
        legalBasesKey ? legalBasesKey.split('|') : [],
        legalBaseRules,
        groups,
        errandClassificationGroupPriority
      ),
    [errandClassificationGroupPriority, groups, labelStructure, labelTree, legalBaseRules, legalBasesKey]
  );
  const modelRef = useRef(model);
  modelRef.current = model;

  // These values have no native inputs to spread register() onto. Register them during render so
  // watch/setValue are connected before the first user interaction.
  register('category');
  register('type');
  register('subType');
  register('classificationHasSubTypes');
  register('labels', {
    validate: (labels, values) => {
      const selections = getAvvikelseGroupedClassificationSelection(modelRef.current, labels, values);
      return getMissingAvvikelseGroupedClassificationChoices(modelRef.current, selections).length === 0
        ? true
        : INCOMPLETE_CLASSIFICATION_MESSAGE;
    },
  });
  const [watchedLabels, category, type, subType] = useWatch({
    control,
    name: ['labels', 'category', 'type', 'subType'],
  });
  const labels = useMemo(() => watchedLabels ?? [], [watchedLabels]);
  const selections = useMemo(
    () => getAvvikelseGroupedClassificationSelection(model, labels, { category, type, subType }),
    [category, labels, model, subType, type]
  );
  const missingChoices = useMemo(
    () => getMissingAvvikelseGroupedClassificationChoices(model, selections),
    [model, selections]
  );
  const showErrors = Boolean(errors.labels);

  const publish = (update: AvvikelseGroupedClassificationUpdate) => {
    const errandClassification = update.errandClassification;
    // Mark the owning form dirty before publishing the individual field updates.
    onClassificationChange?.();
    setValue('labels', update.labels, { shouldDirty: true });
    setValue('category', errandClassification?.category ?? '', { shouldDirty: true });
    setValue('type', errandClassification?.type ?? '', { shouldDirty: true });
    setValue('subType', errandClassification?.subType ?? '', { shouldDirty: true });
    setValue('classificationHasSubTypes', errandClassification?.requiresSubType ?? false, { shouldDirty: false });
    // Errors are shown once a save has asked for them; a change only clears the ones it resolves.
    if (showErrors) void trigger('labels');
  };

  // A group the legal bases no longer reach loses its path, so the errand never keeps a classification
  // its legal bases do not allow. Only a change of legal bases does this - never loading the errand.
  const previousLegalBasesKey = useRef(legalBasesKey);
  useEffect(() => {
    const previousKey = previousLegalBasesKey.current;
    previousLegalBasesKey.current = legalBasesKey;
    if (disabled || previousKey === legalBasesKey || model.completeModel.bindings.length === 0) return;
    const update = applyAvvikelseGroupedClassificationSelection(model, labels, selections);
    if (update.labelsChanged) publish(update);
    // publish is recreated every render and reads nothing the dependencies below do not already cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, labels, legalBasesKey, model, selections]);

  const changeGroup = (groupKey: string, selection: LabelClassificationSelection) =>
    publish(applyAvvikelseGroupedClassificationSelection(model, labels, { ...selections, [groupKey]: selection }));

  const fields = model.groups.map(({ group, label, model: groupModel }) => ({
    key: group.key,
    label,
    catalog: groupModel.catalog,
    missing: showErrors ? missingChoices.find((choice) => choice.groupKey === group.key)?.missing : undefined,
  }));

  return (
    <section
      className="my-md w-full"
      aria-labelledby="avvikelse-label-categorization-heading"
      data-cy="avvikelse-label-categorization"
    >
      <div className="mb-lg">
        <h3 id="avvikelse-label-categorization-heading" className="text-h4-md">
          Kategorisering
        </h3>
        <p className="mt-xs">
          {fields.length === 0
            ? avvikelseGroupedClassificationContent.noLegalBases
            : avvikelseGroupedClassificationContent.everyLegalBase}
        </p>
      </div>

      <AvvikelseGroupedClassificationFields
        fields={fields}
        selections={selections}
        disabled={disabled}
        onChange={changeGroup}
      />
    </section>
  );
};
