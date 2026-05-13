import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { Combobox, FormControl, FormErrorMessage, FormLabel, Select } from '@sk-web-gui/react';
import { isSupportErrandLocked, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const CLASSIFICATIONS = {
  CATEGORY: 'CATEGORY',
  TYPE: 'TYPE',
  SUBTYPE: 'SUBTYPE',
} as const;

type Classification = (typeof CLASSIFICATIONS)[keyof typeof CLASSIFICATIONS];
type SelectedLabels = Partial<Record<Classification, Label>>;

const getSelectedLabels = (errandLabels: Label[]): SelectedLabels => {
  const category = errandLabels.find((l) => l.classification === CLASSIFICATIONS.CATEGORY);
  const type = errandLabels.find((l) => l.classification === CLASSIFICATIONS.TYPE);
  const subtype = errandLabels.find((l) => l.classification === CLASSIFICATIONS.SUBTYPE);

  const selected: SelectedLabels = {};
  if (category) {
    selected.CATEGORY = category;
    if (type) {
      selected.TYPE = type;
      if (subtype) {
        selected.SUBTYPE = subtype;
      }
    }
  }
  return selected;
};

const getErrandLabelId = (errand: SupportErrand, classification: Classification): string | undefined =>
  (errand.labels ?? []).find((l) => l.classification === classification)?.id;

export const ThreeLevelCategorization: FC<{
  supportErrand: SupportErrand;
  supportMetadata: SupportMetadata;
}> = ({ supportErrand, supportMetadata }) => {
  const { getValues, setValue, trigger, formState }: UseFormReturn<SupportErrand> = useFormContext();
  const { errors } = formState;
  const { t } = useTranslation();

  const [selectedLabels, setSelectedLabels] = useState<SelectedLabels>({});
  const [typesList, setTypesList] = useState<Label[]>([]);

  const categoriesList = supportMetadata?.labels?.labelStructure?.sort((a, b) =>
    (a.displayName ?? '').localeCompare(b.displayName ?? '')
  );

  useEffect(() => {
    if (supportErrand) {
      setSelectedLabels(getSelectedLabels(supportErrand.labels ?? []));
    }
  }, [supportErrand]);

  useEffect(() => {
    const categoryItem = categoriesList?.find(
      (c) => c.id === getErrandLabelId(supportErrand, CLASSIFICATIONS.CATEGORY)
    );
    setTypesList(categoryItem?.labels?.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '')) ?? []);
  }, [categoriesList, supportErrand]);

  useEffect(() => {
    if (selectedLabels.CATEGORY && selectedLabels.TYPE) {
      const labels = [selectedLabels.CATEGORY, selectedLabels.TYPE];
      if (selectedLabels.SUBTYPE) {
        labels.push(selectedLabels.SUBTYPE);
      }
      setValue('labels', labels);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabels]);

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedCategory = categoriesList?.find((c) => c.id === e.currentTarget.value);
    setTypesList(
      selectedCategory?.labels?.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '')) ?? []
    );
    setSelectedLabels({ CATEGORY: selectedCategory! });
    setValue('category', selectedCategory?.resourcePath ?? '', { shouldDirty: true });
    setValue('type', '' as any, { shouldDirty: true });
    setValue('subType', '' as any, { shouldDirty: true });
    trigger(['category', 'type', 'subType']);
  };

  const findType = (value: string): Label | undefined => {
    if (typesList.length > 0) {
      return (
        typesList.find((type) => type.labels?.some((label) => label.id === value)) ||
        typesList.find((type) => type.id === value)
      );
    }
    return supportErrand.labels?.find((l) => l.classification === CLASSIFICATIONS.TYPE && l.id === value);
  };

  const findSubType = (value: string, type?: Label): Label | undefined => {
    if (type?.labels?.length) {
      return type.labels.find((label) => label.id === value);
    }
    return supportErrand.labels?.find((l) => l.classification === CLASSIFICATIONS.SUBTYPE && l.id === value);
  };

  const handleTypeSelect = (e: { target: { value: string | string[] } }) => {
    const value = Array.isArray(e.target.value) ? e.target.value[0] : e.target.value;
    const type = findType(value);
    if (!type) return;

    const subType = findSubType(value, type);
    const isTypeDirty = getErrandLabelId(supportErrand, CLASSIFICATIONS.TYPE) !== type.id;

    if (subType) {
      setSelectedLabels((prev) => ({ ...prev, TYPE: type, SUBTYPE: subType }));
      const isSubTypeDirty = getErrandLabelId(supportErrand, CLASSIFICATIONS.SUBTYPE) !== subType.id;
      setValue('type', type.resourcePath ?? '', { shouldDirty: isTypeDirty });
      setValue('subType', subType.resourcePath ?? '', { shouldDirty: isSubTypeDirty });
      trigger(['type', 'subType']);
    } else {
      setSelectedLabels((prev) => ({ ...prev, TYPE: type, SUBTYPE: undefined }));
      setValue('type', type.resourcePath ?? '', { shouldDirty: isTypeDirty });
      trigger('type');
    }
  };

  const typePlaceholder = getValues().subType
    ? selectedLabels.SUBTYPE?.displayName
    : getValues().type
    ? selectedLabels.TYPE?.displayName
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
            value={selectedLabels.CATEGORY?.id}
            onChange={handleCategoryChange}
          >
            <Select.Option value="">Välj verksamhet</Select.Option>
            {categoriesList?.map((label: Label) => (
              <Select.Option value={label.id} key={`label-${label.id}`}>
                {label.displayName || label.resourcePath}
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
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="labelType-wrapper"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            placeholder={typePlaceholder}
            value={selectedLabels.SUBTYPE?.id ?? selectedLabels.TYPE?.id}
            onSelect={handleTypeSelect}
          >
            <Combobox.Input data-cy="labelType-input" className="w-full" />
            <Combobox.List data-cy="labelType-list" className="!max-h-[30em]">
              {typesList.map((typeLabel, index) =>
                (typeLabel.labels?.length ?? 0) > 0 ? (
                  <Combobox.Optgroup key={`group-${index}`} label={typeLabel.displayName || typeLabel.resourcePath}>
                    {typeLabel.labels
                      ?.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
                      .map((subtypeLabel) => (
                        <Combobox.Option value={subtypeLabel.id!} key={`label-${subtypeLabel.resourcePath}`}>
                          {`${subtypeLabel.displayName || subtypeLabel.resourcePath}`}
                        </Combobox.Option>
                      ))}
                  </Combobox.Optgroup>
                ) : (
                  <Combobox.Option value={typeLabel.id!} key={`label-${typeLabel.resourcePath}`}>
                    {`${typeLabel.displayName || typeLabel.resourcePath}`}
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
