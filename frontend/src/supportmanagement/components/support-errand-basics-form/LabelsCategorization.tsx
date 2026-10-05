import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { Combobox, FormControl, FormErrorMessage, FormLabel } from '@sk-web-gui/react';
import { isSupportErrandLocked, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  getLabelDisplayName,
  getSelectableBranches,
  getSelectableTypesForCategory,
} from '@supportmanagement/services/support-label-service';
import {
  getErrandLabelsSelection,
  hasChildLabels,
  LabelsSelection,
  selectLabel,
  toLabelsFormValues,
  withLabelsSelection,
} from '@supportmanagement/services/support-labels-categorization-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { FC, useEffect, useMemo, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/** Form fields that back the validation of the selection. They are not rendered as inputs. */
const CATEGORIZATION_FIELDS = ['category', 'type'] as const;

const byDisplayName = (a: Label, b: Label) => (a.displayName ?? '').localeCompare(b.displayName ?? '');

/** The picked label among the options of a combobox: one of the group labels or a label under one. */
const findOption = (groups: Label[], id: string): Label | undefined =>
  groups.flatMap((group) => [group, ...(group.labels ?? [])]).find((label) => label.id === id);

const pickedValue = (event: { target: { value: string | string[] } }): string =>
  Array.isArray(event.target.value) ? event.target.value[0] : event.target.value;

/**
 * Options for a combobox that covers two levels: the upper level heads a group of the lower level's
 * options, and an upper level label with nothing below it is an option of its own. Returned as elements
 * rather than a component, since Combobox.List only picks up options and groups among its own children.
 */
const renderLabelPairOptions = (groups: Label[], metadata: SupportMetadata) =>
  [...groups].sort(byDisplayName).map((group) =>
    hasChildLabels(group) ? (
      <Combobox.Optgroup key={`group-${group.id}`} label={getLabelDisplayName(group, metadata)}>
        {[...(group.labels ?? [])].sort(byDisplayName).map((option) => (
          <Combobox.Option key={`option-${option.id}`} value={option.id!}>
            {getLabelDisplayName(option, metadata)}
          </Combobox.Option>
        ))}
      </Combobox.Optgroup>
    ) : (
      <Combobox.Option key={`option-${group.id}`} value={group.id!}>
        {getLabelDisplayName(group, metadata)}
      </Combobox.Option>
    )
  );

/**
 * Categorization for a label tree below a categorization root, used with the labels categorization
 * feature. The root is never picked; its classification display name heads the comboboxes. The levels
 * below it are picked two at a time: the first combobox covers levels 1 and 2, the second levels 3 and 4
 * under the first choice.
 */
export const LabelsCategorization: FC<{
  supportErrand: SupportErrand;
  supportMetadata: SupportMetadata;
}> = ({ supportErrand, supportMetadata }) => {
  const { register, resetField, getValues, setValue, trigger, formState }: UseFormReturn<SupportErrand> =
    useFormContext();
  const { errors } = formState;
  const { t } = useTranslation();

  const errandSelection = useMemo(
    () => getErrandLabelsSelection(supportErrand?.labels, supportMetadata),
    [supportErrand?.labels, supportMetadata]
  );
  const [selection, setSelection] = useState<LabelsSelection>(errandSelection);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(errandSelection);
    // A reset of the form drops field registrations, so the fields are registered again before
    // resetField sets them to the errand's labels without marking the form as changed.
    const formValues = toLabelsFormValues(errandSelection);
    CATEGORIZATION_FIELDS.forEach((field) => {
      register(field);
      resetField(field, { defaultValue: formValues[field] });
    });
  }, [errandSelection, register, resetField]);

  // Labels already set on the errand stay selectable even when deprecated, so it keeps showing its own
  // classification.
  const keepIds = selection.path.map((label) => label.id);
  const firstGroups = getSelectableBranches(supportMetadata?.labels?.labelStructure, keepIds);
  const secondGroups = getSelectableTypesForCategory(selection.first, keepIds);

  // Dirty state is judged against the errand's own labels, which resetField made the default values.
  const applySelection = (nextSelection: LabelsSelection) => {
    setSelection(nextSelection);
    const formValues = toLabelsFormValues(nextSelection);
    CATEGORIZATION_FIELDS.forEach((field) => setValue(field, formValues[field], { shouldDirty: true }));
    setValue('labels', withLabelsSelection(getValues('labels'), nextSelection, supportMetadata));
    trigger([...CATEGORIZATION_FIELDS]);
  };

  const isLocked = isSupportErrandLocked(supportErrand);
  const categorizationName = supportMetadata?.labels?.classificationDisplayName;

  return (
    <fieldset className="w-full" data-cy="labelsCategorization">
      {categorizationName && <FormLabel as="legend">{categorizationName}</FormLabel>}
      <div className="w-full flex gap-20">
        <div className="flex my-md gap-xl w-1/2">
          <FormControl id="labelsCategory" className="w-full" readOnly={!supportMetadata}>
            <FormLabel>Verksamhet*</FormLabel>
            <Combobox
              data-cy="labelsCategory-wrapper"
              className="w-full text-dark-primary"
              variant="primary"
              size="md"
              placeholder={selection.first ? getLabelDisplayName(selection.first, supportMetadata) : 'Välj verksamhet'}
              value={selection.first?.id ?? ''}
              onSelect={(event) =>
                applySelection(selectLabel(findOption(firstGroups, pickedValue(event)), supportMetadata))
              }
            >
              {/* The input, not the Combobox itself, is what takes `disabled`. */}
              <Combobox.Input data-cy="labelsCategory-input" className="w-full" disabled={isLocked} />
              <Combobox.List data-cy="labelsCategory-list" className="!max-h-[30em]">
                {renderLabelPairOptions(firstGroups, supportMetadata)}
              </Combobox.List>
            </Combobox>
            {errors.category && (
              <div className="my-sm text-error" data-cy="labelsCategory-error">
                <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
        <div className="flex my-md gap-xl w-1/2">
          <FormControl id="labelsType" className="w-full" readOnly={!supportMetadata}>
            <FormLabel>
              {t(
                `common:basics_tab.errandType.${process.env.NEXT_PUBLIC_APPLICATION}`,
                t(`common:basics_tab.errandType.default`)
              )}
            </FormLabel>
            <Combobox
              data-cy="labelsType-wrapper"
              className="w-full text-dark-primary"
              variant="primary"
              size="md"
              placeholder={selection.second ? getLabelDisplayName(selection.second, supportMetadata) : 'Välj ärendetyp'}
              value={selection.second?.id ?? ''}
              onSelect={(event) =>
                applySelection(selectLabel(findOption(secondGroups, pickedValue(event)), supportMetadata))
              }
            >
              {/* There is nothing to choose until a verksamhet with something below it is selected. */}
              <Combobox.Input
                data-cy="labelsType-input"
                className="w-full"
                disabled={isLocked || !hasChildLabels(selection.first)}
              />
              <Combobox.List data-cy="labelsType-list" className="!max-h-[30em]">
                {renderLabelPairOptions(secondGroups, supportMetadata)}
              </Combobox.List>
            </Combobox>
            {errors.type && (
              <div className="my-sm text-error" data-cy="labelsType-error">
                <FormErrorMessage>{errors.type?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      </div>
    </fieldset>
  );
};
