import { useMetadataStore, useSupportStore } from '@stores/index';
import { FormControl, FormErrorMessage, FormLabel, Select } from '@sk-web-gui/react';
import {
  isSupportErrandLocked,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Controller, useFormContext, UseFormReturn } from 'react-hook-form';

export const TwoLevelCategorization: React.FC = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const formControls: UseFormReturn<SupportErrand> = useFormContext();
  const { control, setValue, watch, formState } = formControls;

  const { errors } = formState;
  const { category } = watch();

  const { t } = useTranslation();

  const categoriesList = supportMetadata?.categories;
  const typesList = useMemo(
    () => categoriesList?.find((c) => c.name === category)?.types || [],
    [category, categoriesList]
  );

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
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={isSupportErrandLocked(supportErrand!)}
                data-cy="category-input"
                className="w-full text-dark-primary"
                variant="primary"
                size="md"
                onChange={(e) => {
                  field.onChange(e.currentTarget.value);
                  setValue('type', undefined as any, { shouldDirty: true });
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
            )}
          />
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
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                disabled={isSupportErrandLocked(supportErrand!)}
                data-cy="type-input"
                className="w-full text-dark-primary"
                variant="primary"
                size="md"
                onChange={(e) => {
                  field.onChange(e.currentTarget.value);
                }}
              >
                <Select.Option value="">Välj ärendetyp</Select.Option>
                {typesList?.map((type) => (
                  <Select.Option value={type.name} key={`type-${type.name}`}>
                    {type.displayName}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
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
