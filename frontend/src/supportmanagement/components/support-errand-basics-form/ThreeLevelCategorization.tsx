import { Category, Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import { Combobox, FormControl, FormErrorMessage, FormLabel, Select } from '@sk-web-gui/react';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  defaultSupportErrandInformation,
  isSupportErrandLocked,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getSupportMetadata, SupportMetadata, SupportType } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'next-i18next';

const LABEL_LEVELS = {
  CATEGORY: 'CATEGORY',
  TYPE: 'TYPE',
  SUBTYPE: 'SUBTYPE',
};

export const ThreeLevelCategorization: React.FC<{
  supportErrand: SupportErrand;
}> = (props) => {
  const {
    supportMetadata,
  }: {
    supportMetadata: SupportMetadata;
    supportAttachments: SupportAttachment[];
    supportAdmins: SupportAdmin[];
    user: User;
  } = useAppContext();

  const formControls: UseFormReturn<SupportErrand> = useFormContext();
  const { watch, setValue, trigger, register, formState } = formControls;
  const { errors } = formState;
  const { category, type, labels } = watch();
  const { supportErrand } = props;
  const [categoriesList, setCategoriesList] = useState<Label[]>();
  const [typesList, setTypesList] = useState<Label[]>();
  const { t } = useTranslation();

  // Needed until labels and old categories have identical names
  const [oldCategoriesList, setOldCategoriesList] = useState<Category[]>();
  const [oldTypesList, setOldTypesList] = useState<SupportType[]>();

  const [selectedLabels, setSelectedLabels] = useState<{ [key: string]: Label }>({});

  useEffect(() => {
    if (supportMetadata) {
      setCategoriesList(
        supportMetadata?.labels?.labelStructure.sort((a, b) => a.displayName.localeCompare(b.displayName))
      );
      setOldCategoriesList(supportMetadata?.categories);
    } else {
      getSupportMetadata(defaultSupportErrandInformation.municipalityId).then((data) => {
        setCategoriesList(
          data.metadata?.labels?.labelStructure.sort((a, b) => a.displayName.localeCompare(b.displayName))
        );
        setOldCategoriesList(data.metadata?.categories);
      });
    }
  }, [supportMetadata]);

  useEffect(() => {
    if (supportErrand && categoriesList?.length > 0) {
      const selected = getSelectedLabels(supportErrand.labels, categoriesList);
      setSelectedLabels(selected);
    }
  }, [categoriesList, supportErrand]);

  useEffect(() => {
    const categoryItem = categoriesList?.find((c) => c.name === category);
    setTypesList(categoryItem?.labels?.sort((a, b) => a.displayName?.localeCompare(b.displayName)) || []);
    setOldTypesList(oldCategoriesList?.find((c) => c.name === category)?.types || []);
  }, [category, categoriesList]);

  useEffect(() => {
    const selectedLabelsArray = Object.values(selectedLabels)
      .filter(Boolean)
      .map((label) => label.name);
    setValue('labels', selectedLabelsArray, { shouldDirty: true });
  }, [selectedLabels]);

  const getSelectedLabels = (errandLabels: string[], labelCategories: Label[]): { [key: string]: Label } => {
    const selected: { [key: string]: Label } = {};
    const labelCategory = labelCategories.find((c) => errandLabels?.includes(c.name));
    if (labelCategory) {
      selected[LABEL_LEVELS.CATEGORY] = labelCategory;
      const labelType = labelCategory.labels?.find((c) => errandLabels?.includes(c.name));
      if (labelType) {
        selected[LABEL_LEVELS.TYPE] = labelType;
        const labelSubtype = labelType.labels?.find((c) => errandLabels?.includes(c.name));
        if (labelSubtype) {
          selected[LABEL_LEVELS.SUBTYPE] = labelSubtype;
        }
      }
    }
    return selected;
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCategory = categoriesList.find((c) => c.name === e.currentTarget.value);
    setSelectedLabels({
      [LABEL_LEVELS.CATEGORY]: selectedCategory,
    });
    setValue('category', e.currentTarget.value, { shouldDirty: true });
    setValue('type', undefined, { shouldDirty: true });
    trigger(['category', 'type']);
  };

  return (
    <>
      <div className="flex my-md gap-xl w-1/2">
        <FormControl id="labelCategory" className="w-full">
          <FormLabel>Verksamhet*</FormLabel>
          <Select
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="labelCategory-input"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            value={selectedLabels['CATEGORY']?.name}
            onChange={handleCategoryChange}
          >
            <Select.Option value="">Välj verksamhet</Select.Option>
            {categoriesList?.map((label: Label) => (
              <Select.Option value={label.name} key={`label-${label.name}`}>
                {label.displayName || label.name}
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
        <FormControl id="labelType" className="w-full">
          <FormLabel>
            {t(
              `common:basics_tab.errandType.${process.env.NEXT_PUBLIC_APPLICATION}`,
              t(`common:basics_tab.errandType.default`)
            )}
          </FormLabel>
          <Combobox
            {...register('type')}
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="labelType-wrapper"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            placeholder={
              selectedLabels
                ? selectedLabels['SUBTYPE']?.displayName || selectedLabels['TYPE']?.displayName
                : 'Välj ärendetyp'
            }
            value={selectedLabels['SUBTYPE']?.name || selectedLabels['TYPE']?.name}
            onSelect={(e) => {
              let selectedType = typesList?.find((type) => type.labels?.some((label) => label.name === e.target.value));
              if (selectedType) {
                const selectedSubtype = selectedType?.labels?.find((label) => label.name === e.target.value);
                setSelectedLabels((prev) => ({
                  ...prev,
                  [LABEL_LEVELS.TYPE]: selectedType,
                  [LABEL_LEVELS.SUBTYPE]: selectedSubtype,
                }));
              } else {
                selectedType = typesList?.find((type) => type.name === e.target.value);
                setSelectedLabels((prev) => ({
                  ...prev,
                  [LABEL_LEVELS.TYPE]: selectedType,
                  [LABEL_LEVELS.SUBTYPE]: undefined,
                }));
              }
              const oldType = oldTypesList?.find((c) => c.name === selectedType?.name);
              setValue('type', oldType?.name, { shouldDirty: true });
              trigger('type');
            }}
            onChange={() => {}}
          >
            <Combobox.Input data-cy="labelType-input" className="w-full" />
            <Combobox.List data-cy="labelType-list" className="!max-h-[30em]">
              {typesList?.map((typeLabel: Label, index) => {
                if (typeLabel.labels?.length > 0) {
                  return (
                    <Combobox.Optgroup key={`group-${index}`} label={typeLabel.displayName || typeLabel.name}>
                      {typeLabel.labels
                        ?.sort((a, b) => a.displayName.localeCompare(b.displayName))
                        .map((subtypeLabel: Label) => (
                          <Combobox.Option value={subtypeLabel.name} key={`label-${subtypeLabel.name}`}>
                            {subtypeLabel.displayName || subtypeLabel.name}
                          </Combobox.Option>
                        ))}
                    </Combobox.Optgroup>
                  );
                } else {
                  return (
                    <Combobox.Option value={typeLabel.name} key={`label-${typeLabel.name}`}>
                      {typeLabel.displayName || typeLabel.name}
                    </Combobox.Option>
                  );
                }
              })}
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
