import { Category } from '@common/data-contracts/supportmanagement/data-contracts';
import { useAppContext } from '@contexts/app.context';
import { FormControl, FormErrorMessage, FormLabel, Select } from '@sk-web-gui/react';
import {
  defaultSupportErrandInformation,
  isSupportErrandLocked,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getSupportMetadata, SupportType } from '@supportmanagement/services/support-metadata-service';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

export const TwoLevelCategorization: React.FC = () => {
  const { supportErrand, supportMetadata } = useAppContext();
  const formControls: UseFormReturn<SupportErrand> = useFormContext();
  const { getValues, setValue, trigger, register, watch, formState } = formControls;

  const { errors } = formState;
  const { category } = watch();

  const { t } = useTranslation();

  const [categoriesList, setCategoriesList] = useState<Category[]>();
  const [typesList, setTypesList] = useState<SupportType[]>([]);

  useEffect(() => {
    if (supportMetadata) {
      setCategoriesList(supportMetadata?.categories);
    } else {
      getSupportMetadata(defaultSupportErrandInformation.municipalityId).then((data) => {
        setCategoriesList(data.metadata?.categories);
      });
    }
  }, [supportMetadata]);

  useEffect(() => {
    setTypesList(categoriesList?.find((c) => c.name === category)?.types || []);
  }, [category, categoriesList]);

  // Helper function to find type with fallback when typesList is not ready
  const findType = (typeName: string): SupportType | undefined => {
    if (typesList.length > 0) {
      return typesList.find((t) => t.name === typeName);
    }
    // Fallback: search in metadata when typesList not ready yet
    if (supportErrand?.type && supportMetadata?.categories) {
      const existingCategory = supportMetadata.categories.find((c) => c.name === supportErrand.category);
      return existingCategory?.types?.find((t) => t.name === typeName);
    }
    return undefined;
  };

  return (
    <>
      <div className="flex my-md gap-xl w-1/2">
        <FormControl id="category" className="w-full">
          <FormLabel>
            {t(
              `common:basics_tab.categories.${process.env.NEXT_PUBLIC_APPLICATION}`,
              t('common:basics_tab.categories.default')
            )}
          </FormLabel>
          <Select
            {...register('category')}
            disabled={isSupportErrandLocked(supportErrand!)}
            data-cy="category-input"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            value={getValues().category}
            onChange={(e) => {
              const selectedCategory = e.currentTarget.value;
              const isCategoryDirty = supportErrand?.category !== selectedCategory;
              setValue('category', selectedCategory, { shouldDirty: isCategoryDirty });
              setValue('type', undefined as any, { shouldDirty: isCategoryDirty });
              trigger('category');
              trigger('type');
            }}
          >
            <Select.Option value="">Välj ärendekategori</Select.Option>
            {categoriesList
              ?.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
              .map((categori) => (
                <Select.Option value={categori.name} key={`categori-${categori.name}`}>
                  {categori.displayName}
                </Select.Option>
              ))}
          </Select>
          {errors.category && (
            <div className="my-sm text-error">
              <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
            </div>
          )}
        </FormControl>
      </div>
      <div className="flex my-md gap-xl w-1/2">
        <FormControl id="type" className="w-full">
          <FormLabel>
            {t(
              `common:basics_tab.labels.${process.env.NEXT_PUBLIC_APPLICATION}`,
              t('common:basics_tab.labels.default')
            )}
          </FormLabel>
          <Select
            {...register('type')}
            disabled={isSupportErrandLocked(supportErrand!)}
            data-cy="type-input"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            value={getValues().type}
            onChange={(e) => {
              const selectedType = e.currentTarget.value;
              const type = findType(selectedType);
              // Guard: don't process invalid selection (except for empty value)
              if (!type && selectedType !== '') return;

              const isTypeDirty = supportErrand?.type !== selectedType;
              setValue('type', selectedType, { shouldDirty: isTypeDirty });
              trigger('type');
            }}
          >
            <Select.Option value="">Välj ärendetyp</Select.Option>
            {typesList?.map((type) => (
              <Select.Option value={type.name} key={`type-${type.name}`}>
                {type.displayName}
              </Select.Option>
            ))}
          </Select>
          {errors.type && (
            <div className="my-sm text-error">
              <FormErrorMessage>{errors.type?.message}</FormErrorMessage>
            </div>
          )}
        </FormControl>
      </div>
    </>
  );
};
