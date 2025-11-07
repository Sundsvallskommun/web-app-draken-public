import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
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
import { getSupportMetadata, SupportMetadata } from '@supportmanagement/services/support-metadata-service';
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
  const { getValues, setValue, trigger, formState } = formControls;
  const { errors } = formState;
  const { supportErrand } = props;
  const [categoriesList, setCategoriesList] = useState<Label[]>();
  const [typesList, setTypesList] = useState<Label[]>();
  const { t } = useTranslation();

  const [selectedLabels, setSelectedLabels] = useState<{ [key: string]: Label }>({});

  const getSelectedLabels = (errandLabels: Label[]): { [key: string]: Label } => {
    const selected: { [key: string]: Label } = {};
    const labelCategory = errandLabels.find((c) => c.classification === 'CATEGORY');
    const labelType = errandLabels.find((c) => c.classification === 'TYPE');
    const labelSubtype = errandLabels.find((c) => c.classification === 'SUBTYPE');
    if (labelCategory) {
      selected[LABEL_LEVELS.CATEGORY] = labelCategory;
      if (labelType) {
        selected[LABEL_LEVELS.TYPE] = labelType;
        if (labelSubtype) {
          selected[LABEL_LEVELS.SUBTYPE] = labelSubtype;
        }
      }
    }
    return selected;
  };

  useEffect(() => {
    if (supportMetadata) {
      setCategoriesList(
        supportMetadata?.labels?.labelStructure.sort((a, b) => a.displayName.localeCompare(b.displayName))
      );
    } else {
      getSupportMetadata(defaultSupportErrandInformation.municipalityId).then((data) => {
        setCategoriesList(
          data.metadata?.labels?.labelStructure.sort((a, b) => a.displayName.localeCompare(b.displayName))
        );
      });
    }
  }, [supportMetadata]);

  useEffect(() => {
    if (supportErrand) {
      const selected = getSelectedLabels(supportErrand.labels);
      setSelectedLabels(selected);
    }
  }, [supportErrand]);

  useEffect(() => {
    const categoryItem = categoriesList?.find(
      (c) => c.id === supportErrand.labels.find((l) => l.classification === 'CATEGORY')?.id
    );
    setTypesList(categoryItem?.labels?.sort((a, b) => a.displayName?.localeCompare(b.displayName)) || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesList, supportErrand]);

  useEffect(() => {
    const selectedLabelsArray = [];
    if (selectedLabels['CATEGORY']) {
      selectedLabelsArray.push(selectedLabels['CATEGORY']);
    }
    if (selectedLabels['TYPE']) {
      selectedLabelsArray.push(selectedLabels['TYPE']);
    }
    if (selectedLabels['SUBTYPE']) {
      selectedLabelsArray.push(selectedLabels['SUBTYPE']);
    }
    setValue('labels', selectedLabelsArray); //, { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabels]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCategory = categoriesList.find((c) => c.id === e.currentTarget.value);
    setTypesList(selectedCategory?.labels?.sort((a, b) => a.displayName.localeCompare(b.displayName)) || []);
    setSelectedLabels({
      [LABEL_LEVELS.CATEGORY]: selectedCategory,
    });
    setValue('category', selectedCategory.resourcePath, { shouldDirty: true });
    setValue('type', undefined, { shouldDirty: true });
    setValue('subType', undefined, { shouldDirty: true });
    trigger(['category', 'type', 'subType']);
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
            value={selectedLabels['CATEGORY']?.id}
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
        <FormControl id="labelType" className="w-full">
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
            placeholder={
              getValues().subType
                ? selectedLabels['SUBTYPE']?.displayName
                : getValues().type
                ? selectedLabels['TYPE']?.displayName
                : 'Välj ärendetyp'
            }
            value={selectedLabels['SUBTYPE']?.id ?? selectedLabels['TYPE']?.id}
            onSelect={(e) => {
              let selectedType = typesList?.find((type) => type.labels?.some((label) => label.id === e.target.value));
              if (selectedType) {
                const selectedSubtype = selectedType?.labels?.find((label) => label.id === e.target.value);
                setSelectedLabels((prev) => ({
                  ...prev,
                  [LABEL_LEVELS.TYPE]: selectedType,
                  [LABEL_LEVELS.SUBTYPE]: selectedSubtype,
                }));
                const dirtied =
                  supportErrand.labels.find((l) => l.classification === 'SUBTYPE')?.id !== selectedSubtype?.id;
                setValue('subType', selectedSubtype?.resourcePath, {
                  shouldDirty: dirtied,
                });
              } else {
                selectedType = typesList?.find((type) => type.id === e.target.value);
                setSelectedLabels((prev) => ({
                  ...prev,
                  [LABEL_LEVELS.TYPE]: selectedType,
                  [LABEL_LEVELS.SUBTYPE]: undefined,
                }));
              }
              setValue('type', selectedType?.resourcePath, { shouldDirty: true });
              trigger('type');
            }}
            onChange={() => {}}
          >
            <Combobox.Input data-cy="labelType-input" className="w-full" />
            <Combobox.List data-cy="labelType-list" className="!max-h-[30em]">
              {typesList?.map((typeLabel: Label, index) => {
                if (typeLabel.labels?.length > 0) {
                  return (
                    <Combobox.Optgroup key={`group-${index}`} label={typeLabel.displayName || typeLabel.resourcePath}>
                      {typeLabel.labels
                        ?.sort((a, b) => a.displayName.localeCompare(b.displayName))
                        .map((subtypeLabel: Label) => (
                          <Combobox.Option value={subtypeLabel.id} key={`label-${subtypeLabel.resourcePath}`}>
                            {`${subtypeLabel.displayName || subtypeLabel.resourcePath}`}
                          </Combobox.Option>
                        ))}
                    </Combobox.Optgroup>
                  );
                } else {
                  return (
                    <Combobox.Option value={typeLabel.id} key={`label-${typeLabel.resourcePath}`}>
                      {`${typeLabel.displayName || typeLabel.resourcePath}`}
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
