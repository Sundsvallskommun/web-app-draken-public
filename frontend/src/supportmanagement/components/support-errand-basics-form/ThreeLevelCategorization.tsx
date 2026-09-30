import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { Combobox, FormControl, FormErrorMessage, FormLabel, Select } from '@sk-web-gui/react';
import { isSupportErrandLocked, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  getLabelDisplayName,
  getSelectableLabels,
  getSelectableTypesForCategory,
  resolveErrandLabelPath,
} from '@supportmanagement/services/support-label-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { ChangeEvent, FC, useEffect, useMemo, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * The selected label at each level of the label tree: verksamhet, ärendetyp and undertyp. The levels
 * are positions in the tree, not the labels' own classification, which differs between namespaces
 * (CATEGORY/TYPE/SUBTYPE in one, DEPARTMENT/CATEGORY/TYPE in another).
 */
interface SelectedLabels {
  category?: Label;
  type?: Label;
  subType?: Label;
}

/** Form fields that back the validation of the selection. They are not rendered as inputs. */
const CATEGORIZATION_FIELDS = ['category', 'type', 'subType'] as const;

const toSelectedLabels = ([category, type, subType]: Label[]): SelectedLabels => ({ category, type, subType });

const hasTypes = (category?: Label): boolean => (category?.labels?.length ?? 0) > 0;

/**
 * The form requires a category and a type, holding the resource paths of the selected labels. A
 * verksamhet without ärendetyper is a complete classification on its own, so it then stands in for
 * the type as well.
 */
const toFormValues = ({
  category,
  type,
  subType,
}: SelectedLabels): Record<(typeof CATEGORIZATION_FIELDS)[number], string> => ({
  category: category?.resourcePath ?? '',
  type: type?.resourcePath ?? (category && !hasTypes(category) ? category.resourcePath ?? '' : ''),
  subType: subType?.resourcePath ?? '',
});

const isCompleteSelection = ({ category, type }: SelectedLabels): boolean =>
  !!category && (!!type || !hasTypes(category));

const toErrandLabels = ({ category, type, subType }: SelectedLabels): Label[] =>
  [category, type, subType].filter((label): label is Label => !!label);

export const ThreeLevelCategorization: FC<{
  supportErrand: SupportErrand;
  supportMetadata: SupportMetadata;
}> = ({ supportErrand, supportMetadata }) => {
  const { register, resetField, setValue, trigger, formState }: UseFormReturn<SupportErrand> = useFormContext();
  const { errors } = formState;
  const { t } = useTranslation();

  const [selectedLabels, setSelectedLabels] = useState<SelectedLabels>({});

  const categoriesList = useMemo(
    () =>
      [...(supportMetadata?.labels?.labelStructure ?? [])].sort((a, b) =>
        (a.displayName ?? '').localeCompare(b.displayName ?? '')
      ),
    [supportMetadata?.labels?.labelStructure]
  );

  // The labels set on the errand, matched level by level against the label tree.
  const errandSelection = useMemo(
    () => toSelectedLabels(resolveErrandLabelPath(supportErrand?.labels, supportMetadata)),
    [supportErrand?.labels, supportMetadata]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedLabels(errandSelection);
    // A reset of the form drops field registrations, so the fields are registered again before
    // resetField sets them to the errand's labels without marking the form as changed.
    const formValues = toFormValues(errandSelection);
    CATEGORIZATION_FIELDS.forEach((field) => {
      register(field);
      resetField(field, { defaultValue: formValues[field] });
    });
  }, [errandSelection, register, resetField]);

  const selectedCategory = useMemo(
    () => categoriesList.find((category) => category.id === selectedLabels.category?.id),
    [categoriesList, selectedLabels.category?.id]
  );

  const typesList = useMemo(
    () =>
      [...(selectedCategory?.labels ?? [])].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '')),
    [selectedCategory]
  );

  // `categoriesList` and `typesList` deliberately keep every label, deprecated ones included, since
  // they back the lookups in handleCategoryChange and handleTypeSelect. Only the option lists rendered
  // below are filtered. The labels already set on the errand are kept even when deprecated, so an
  // existing errand still shows its own classification; they can be deselected but not picked again.
  const selectableCategories = useMemo(
    () => getSelectableLabels(categoriesList, [selectedLabels.category?.id]),
    [categoriesList, selectedLabels.category?.id]
  );

  const selectableTypes = useMemo(
    () => getSelectableTypesForCategory(selectedCategory, [selectedLabels.type?.id, selectedLabels.subType?.id]),
    [selectedCategory, selectedLabels.type?.id, selectedLabels.subType?.id]
  );

  // Dirty state is judged against the errand's own labels, which resetField made the default values.
  // Only a complete selection is written to `labels`, so an unfinished change never leaves the labels
  // of the previous selection behind.
  const selectLabels = (selection: SelectedLabels) => {
    setSelectedLabels(selection);
    const formValues = toFormValues(selection);
    CATEGORIZATION_FIELDS.forEach((field) => setValue(field, formValues[field], { shouldDirty: true }));
    setValue('labels', isCompleteSelection(selection) ? toErrandLabels(selection) : []);
    trigger([...CATEGORIZATION_FIELDS]);
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    selectLabels({ category: categoriesList.find((category) => category.id === e.currentTarget.value) });
  };

  const handleTypeSelect = (e: { target: { value: string | string[] } }) => {
    const value = Array.isArray(e.target.value) ? e.target.value[0] : e.target.value;
    const type =
      typesList.find((typeLabel) => typeLabel.labels?.some((label) => label.id === value)) ||
      typesList.find((typeLabel) => typeLabel.id === value);
    if (!type) return;

    selectLabels({ category: selectedCategory, type, subType: type.labels?.find((label) => label.id === value) });
  };

  const typePlaceholder = selectedLabels.subType
    ? getLabelDisplayName(selectedLabels.subType, supportMetadata)
    : selectedLabels.type
    ? getLabelDisplayName(selectedLabels.type, supportMetadata)
    : 'Välj ärendetyp';

  return (
    <>
      <div className="flex my-md gap-xl w-1/2">
        <FormControl id="labelCategory" className="w-full">
          <FormLabel>Verksamhet*</FormLabel>
          <Select
            disabled={isSupportErrandLocked(supportErrand)}
            readOnly={!supportMetadata}
            data-cy="labelCategory-input"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            value={selectedLabels.category?.id}
            onChange={handleCategoryChange}
          >
            <Select.Option value="">Välj verksamhet</Select.Option>
            {selectableCategories.map((label: Label) => (
              <Select.Option value={label.id} key={`label-${label.id}`}>
                {getLabelDisplayName(label, supportMetadata)}
              </Select.Option>
            ))}
          </Select>
          {errors.category && (
            <div className="my-sm text-error" data-cy="labelCategory-error">
              <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
            </div>
          )}
        </FormControl>
      </div>
      <div className="flex my-md gap-xl w-1/2">
        <FormControl id="labelType" className="w-full" readOnly={!supportMetadata}>
          <FormLabel>
            {t(
              `common:basics_tab.errandType.${process.env.NEXT_PUBLIC_APPLICATION}`,
              t(`common:basics_tab.errandType.default`)
            )}
          </FormLabel>

          <Combobox
            disabled={isSupportErrandLocked(supportErrand) || (!!selectedCategory && !hasTypes(selectedCategory))}
            data-cy="labelType-wrapper"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            placeholder={typePlaceholder}
            value={selectedLabels.subType?.id ?? selectedLabels.type?.id ?? ''}
            onSelect={handleTypeSelect}
          >
            <Combobox.Input data-cy="labelType-input" className="w-full" />
            <Combobox.List data-cy="labelType-list" className="!max-h-[30em]">
              {selectableTypes.map((typeLabel) =>
                (typeLabel.labels?.length ?? 0) > 0 ? (
                  <Combobox.Optgroup
                    key={`group-${typeLabel.id ?? typeLabel.resourcePath ?? typeLabel.resourceName}`}
                    label={getLabelDisplayName(typeLabel, supportMetadata)}
                  >
                    {typeLabel.labels
                      ?.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
                      .map((subtypeLabel) => (
                        <Combobox.Option value={subtypeLabel.id!} key={`label-${subtypeLabel.resourcePath}`}>
                          {getLabelDisplayName(subtypeLabel, supportMetadata)}
                        </Combobox.Option>
                      ))}
                  </Combobox.Optgroup>
                ) : (
                  <Combobox.Option value={typeLabel.id!} key={`label-${typeLabel.resourcePath}`}>
                    {getLabelDisplayName(typeLabel, supportMetadata)}
                  </Combobox.Option>
                )
              )}
            </Combobox.List>
          </Combobox>
          {errors.type && (
            <div className="my-sm text-error" data-cy="labelType-error">
              <FormErrorMessage>{errors.type?.message}</FormErrorMessage>
            </div>
          )}
        </FormControl>
      </div>
    </>
  );
};
