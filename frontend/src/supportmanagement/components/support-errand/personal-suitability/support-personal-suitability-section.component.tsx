import { FC } from 'react';
import { useTranslation } from 'react-i18next';

export const SupportPersonalSuitabilitySection: FC<{}> = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-16" data-cy="statements-section">
      <p className="text-dark-secondary m-0">{t('common:personal_suitability.description')}</p>
    </div>
  );
};
