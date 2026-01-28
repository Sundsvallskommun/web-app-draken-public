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
  const [typesList, setTypesList] = useState<SupportType[]>();

  useEffect(() => {
    if (supportMetadata) {
      setCategoriesList(supportMetadata?.categories);
    } else {
      getSupportMetadata().then((data) => {
        setCategoriesList(data.metadata?.categories);
      });
    }
  }, [supportMetadata]);

  useEffect(() => {
    setTypesList(categoriesList?.find((c) => c.name === category)?.types || []);
  }, [category, categoriesList]);

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
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="category-input"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            value={getValues().category}
            onChange={(e) => {
              setValue('category', e.currentTarget.value, { shouldDirty: true });
              setValue('type', undefined, { shouldDirty: true });
              trigger('category');
              trigger('type');
            }}
          >
            <Select.Option value="">Välj ärendekategori</Select.Option>
            {categoriesList
              ?.sort((a, b) => a.displayName.localeCompare(b.displayName))
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
            disabled={isSupportErrandLocked(supportErrand)}
            data-cy="type-input"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            value={getValues().type}
            onChange={(e) => {
              setValue('type', e.currentTarget.value, { shouldDirty: true });
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
