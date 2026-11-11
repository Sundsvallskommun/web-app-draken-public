import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { appConfig } from '@config/appconfig';
import {
  getClassificationCategoryDisplayName,
  getClassificationTypeDisplayName,
  showsLegacyClassification,
} from '@supportmanagement/services/legacy-classification-service';
import { isSupportErrandLocked, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { replaceCategorizationLabels } from '@supportmanagement/services/support-label-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { FC } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { LabelTreePicker } from './LabelTreePicker';

/**
 * Label categorization bound to the errand form: `category` = CATEGORY path (or the DEPARTMENT when the path ends
 * there without children, as a department picked on its own is not a category), `type`,
 * `subType`, `labels` = the picked path. A type is required only when the category has types.
 */
const pathValue = (path: Label[], classification: string): string =>
  path.find((label) => label.classification === classification)?.resourcePath ?? '';

export const LabelCategorization: FC<{
  supportErrand: SupportErrand;
  supportMetadata: SupportMetadata;
  readOnly?: boolean;
}> = ({ supportErrand, supportMetadata, readOnly = false }) => {
  const { setValue, getValues, trigger, formState }: UseFormReturn<SupportErrand> = useFormContext();
  const { errors } = formState;
  const { t } = useTranslation();

  const handleChange = (path: Label[]) => {
    const last = path[path.length - 1];
    const leafDepartment = last?.classification === 'DEPARTMENT' && !last.labels?.length;
    const category = pathValue(path, 'CATEGORY') || (leafDepartment ? pathValue(path, 'DEPARTMENT') : '');
    const type = pathValue(path, 'TYPE');
    const subType = pathValue(path, 'SUBTYPE');
    setValue('category', category, { shouldDirty: category !== supportErrand.category });
    setValue('type', type as any, { shouldDirty: type !== supportErrand.type });
    setValue('subType', subType as any, { shouldDirty: subType !== supportErrand.subType });
    setValue('labels', replaceCategorizationLabels(getValues('labels'), path));
    trigger(['category', 'type', 'subType']);
  };

  // LEGACY_CLASSIFICATION
  const legacyClassification = showsLegacyClassification(supportErrand)
    ? {
        category: getClassificationCategoryDisplayName(supportErrand, supportMetadata),
        type: getClassificationTypeDisplayName(supportErrand, supportMetadata),
      }
    : undefined;

  return (
    <LabelTreePicker
      labelStructure={supportMetadata?.labels?.labelStructure}
      value={supportErrand?.labels}
      onChange={handleChange}
      metadata={supportMetadata}
      firstLevel={appConfig.features.useDepartmentCategorySelect ? 'DEPARTMENT' : 'CATEGORY'}
      disabled={isSupportErrandLocked(supportErrand) || readOnly}
      fallbackLabels={{
        first: t(
          `common:basics_tab.categories.${process.env.NEXT_PUBLIC_APPLICATION}`,
          t('common:basics_tab.categories.default')
        ),
        second: t(
          `common:basics_tab.errandType.${process.env.NEXT_PUBLIC_APPLICATION}`,
          t('common:basics_tab.errandType.default')
        ),
        third: t('common:basics_tab.errandType.default'),
      }}
      errors={{ first: errors.category?.message, second: errors.type?.message }}
      notes={
        legacyClassification && {
          // LEGACY_CLASSIFICATION
          first: (
            <p className="text-small text-dark-secondary mb-4" data-cy="labelCategory-legacy">
              Tidigare klassificering: {legacyClassification.category}
            </p>
          ),
          second: (
            <p className="text-small text-dark-secondary mb-4" data-cy="labelType-legacy">
              Tidigare klassificering: {legacyClassification.type}
            </p>
          ),
        }
      }
    />
  );
};
